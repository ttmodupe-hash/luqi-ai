import importlib.util
import pathlib
import unittest

path = pathlib.Path(__file__).resolve().parents[1] / 'scripts' / 'audit-launch-dns.py'
spec = importlib.util.spec_from_file_location('audit', path)
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)

def valid_rows():
    return [{'resolver': resolver, 'name': name, 'type': kind, 'dns_status': 0,
             'answers': [{'name': name + '.', 'type': numeric, 'data': value}]}
            for resolver in audit.RESOLVERS
            for name, kind, numeric, value in [(audit.APP, 'CNAME', 5, audit.EXPECTED_CNAME + '.'),
                (audit.VERIFY_NAME, 'TXT', 16, '"' + audit.EXPECTED_TXT + '"')]]

class GateTests(unittest.TestCase):
    def test_exact_records_on_both_resolvers(self):
        self.assertTrue(audit.assess(valid_rows())['public_dns_ready'])
    def test_missing_records_block(self):
        self.assertFalse(audit.assess([])['public_dns_ready'])
    def test_one_resolver_is_not_enough(self):
        self.assertFalse(audit.assess(valid_rows()[:2])['public_dns_ready'])
    def test_old_origin_is_rejected(self):
        rows = valid_rows(); rows[0]['answers'][0]['data'] = 'j93it609.up.railway.app.'
        self.assertFalse(audit.assess(rows)['public_dns_ready'])
    def test_nxdomain_is_not_propagation_success(self):
        rows = valid_rows(); rows[0]['dns_status'] = 3
        self.assertFalse(audit.assess(rows)['public_dns_ready'])
    def test_transport_failure_is_unknown(self):
        rows = valid_rows(); rows[0]['transport_error'] = 'TimeoutError'
        self.assertFalse(audit.assess(rows)['public_dns_ready'])
    def test_wrong_owner_name_rejected(self):
        rows = valid_rows(); rows[1]['answers'][0]['name'] = '_railway-verify.other.example.'
        self.assertFalse(audit.assess(rows)['public_dns_ready'])
    def test_duplicate_ownership_records_rejected(self):
        rows = valid_rows(); rows[1]['answers'].append(rows[1]['answers'][0])
        self.assertFalse(audit.assess(rows)['public_dns_ready'])
    def test_wrong_record_type_rejected(self):
        rows = valid_rows(); rows[1]['answers'][0]['type'] = 5
        self.assertFalse(audit.assess(rows)['public_dns_ready'])
    def test_wrong_verification_rejected(self):
        rows = valid_rows(); rows[1]['answers'][0]['data'] = 'railway-verify=wrong'
        self.assertFalse(audit.assess(rows)['public_dns_ready'])

if __name__ == '__main__':
    unittest.main()
