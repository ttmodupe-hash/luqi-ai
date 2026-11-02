import importlib.util
import pathlib
import unittest

path = pathlib.Path(__file__).resolve().parents[1] / 'scripts' / 'audit-launch-dns.py'
spec = importlib.util.spec_from_file_location('audit', path)
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


def valid_rows():
    return [
        {'resolver': resolver, 'name': audit.APP, 'type': 'CNAME',
         'dns_status': 0,
         'answers': [{'name': audit.APP + '.', 'type': 5,
                      'data': audit.EXPECTED_CNAME + '.'}]}
        for resolver in audit.RESOLVERS
    ]


class GateTests(unittest.TestCase):
    def test_app_cname_matches_on_both_resolvers(self):
        self.assertTrue(audit.assess(valid_rows())['public_dns_ready'])

    def test_missing_records_block(self):
        self.assertFalse(audit.assess([])['public_dns_ready'])

    def test_one_resolver_is_not_enough(self):
        self.assertFalse(audit.assess(valid_rows()[:1])['public_dns_ready'])

    def test_old_origin_is_rejected(self):
        rows = valid_rows()
        rows[0]['answers'][0]['data'] = 'j93it609.up.railway.app.'
        self.assertFalse(audit.assess(rows)['public_dns_ready'])

    def test_nxdomain_is_not_propagation_success(self):
        rows = valid_rows()
        rows[0]['dns_status'] = 3
        self.assertFalse(audit.assess(rows)['public_dns_ready'])

    def test_transport_failure_is_unknown(self):
        rows = valid_rows()
        rows[0]['transport_error'] = 'TimeoutError'
        self.assertFalse(audit.assess(rows)['public_dns_ready'])

    def test_wrong_owner_name_rejected(self):
        rows = valid_rows()
        rows[0]['answers'][0]['name'] = 'other.luqi-ai.com.'
        self.assertFalse(audit.assess(rows)['public_dns_ready'])

    def test_duplicate_routing_cnames_rejected(self):
        rows = valid_rows()
        rows[0]['answers'].append(rows[0]['answers'][0].copy())
        self.assertFalse(audit.assess(rows)['public_dns_ready'])

    def test_wrong_record_type_rejected(self):
        rows = valid_rows()
        rows[0]['answers'][0]['type'] = 16
        self.assertFalse(audit.assess(rows)['public_dns_ready'])

    def test_wrong_target_rejected_on_second_resolver(self):
        rows = valid_rows()
        rows[1]['answers'][0]['data'] = 'wrong.up.railway.app.'
        self.assertFalse(audit.assess(rows)['public_dns_ready'])

    def test_retired_verification_txt_is_not_a_routing_gate(self):
        # Railway's current domain-status response has NO required ownership TXT.
        rows = valid_rows()
        rows[0]['answers'].append({'name': '_railway-verify.' + audit.APP + '.',
                                   'type': 16, 'data': '"stale"'})
        self.assertTrue(audit.assess(rows)['public_dns_ready'])

    def test_public_dns_never_asserts_railway_ownership_or_certificate(self):
        observed = audit.assess(valid_rows())
        self.assertIsNone(observed['railway_owner_verified'])
        self.assertIsNone(observed['railway_certificate_valid'])
        self.assertEqual(observed['routing_reference_checked_on'], '2026-11-02')

    def test_health_path_is_current_railway_web_path(self):
        self.assertEqual(audit.HEALTH_PATH, '/v1/health')


if __name__ == '__main__':
    unittest.main()
