"""One-shot, read-only LUQI public DNS/HTTPS observation.

Routing reference checked against Railway production on 2026-11-02. This
standalone tool does NOT verify current Railway account ownership, certificate
issuance or launch approval, and makes no DNS or infrastructure changes.
"""
import concurrent.futures
import json
import ssl
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

DOMAIN = 'luqi-ai.com'
APP = 'app.' + DOMAIN
EXPECTED_CNAME = 'dknuazf0.up.railway.app'
ROUTING_REFERENCE_CHECKED_ON = '2026-11-02'
HEALTH_PATH = '/v1/health'  # Railway web service healthcheckPath, verified 2026-11-02
RESOLVERS = {'google': 'https://dns.google/resolve', 'cloudflare': 'https://cloudflare-dns.com/dns-query'}
QUERIES = [(DOMAIN, 'NS'), (APP, 'CNAME'), (DOMAIN, 'MX'),
           ('mail1._domainkey.' + DOMAIN, 'CNAME'), (DOMAIN, 'CAA')]

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

OPENER = urllib.request.build_opener(NoRedirect(), urllib.request.HTTPSHandler(context=ssl.create_default_context()))

def read_json(url):
    request = urllib.request.Request(url, headers={'Accept': 'application/dns-json', 'User-Agent': 'LUQI-launch-observation/1.0'})
    with OPENER.open(request, timeout=8) as response:
        data = response.read(65537)
        if len(data) > 65536:
            raise ValueError('response bound')
        return json.loads(data)

def observe(item):
    resolver, base, name, record_type = item
    result = {'resolver': resolver, 'name': name, 'type': record_type}
    try:
        value = read_json(base + '?' + urllib.parse.urlencode({'name': name, 'type': record_type}))
        result['dns_status'] = value.get('Status')
        result['answers'] = [{'name': r.get('name'), 'type': r.get('type'), 'data': r.get('data')}
                             for r in value.get('Answer', [])][:32]
    except Exception as error:
        # Error class only: never response HTML, redirects, credentials or local internals.
        result['transport_error'] = type(error).__name__
    return result

def normalized(value):
    return str(value).strip().strip('"').rstrip('.').lower()

def exact_record(observations, resolver, name, kind, expected, numeric_type):
    row = next((r for r in observations if r['resolver'] == resolver and r['name'] == name and r['type'] == kind), None)
    if not row or row.get('dns_status') != 0 or row.get('transport_error'):
        return False
    values = [r.get('data') for r in row.get('answers', [])
              if normalized(r.get('name')) == normalized(name) and r.get('type') == numeric_type]
    return len(values) == 1 and normalized(values[0]) == normalized(expected)

def assess(observations):
    matches = {resolver: {
        'app_cname_matches': exact_record(observations, resolver, APP, 'CNAME', EXPECTED_CNAME, 5)
    } for resolver in RESOLVERS}
    # A CNAME match is public routing evidence, NOT Railway ownership or TLS acceptance.
    return {'matches': matches,
            'public_dns_ready': all(v['app_cname_matches'] for v in matches.values()),
            'railway_owner_verified': None,
            'railway_certificate_valid': None,
            'routing_reference_checked_on': ROUTING_REFERENCE_CHECKED_ON}

def main():
    tasks = [(resolver, base, name, kind) for resolver, base in RESOLVERS.items() for name, kind in QUERIES]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        observations = list(pool.map(observe, tasks))
    assessment = assess(observations)
    https = {'attempted': False, 'verified_https_health': False}
    if assessment['public_dns_ready']:
        https['attempted'] = True
        try:
            request = urllib.request.Request('https://' + APP + HEALTH_PATH, headers={'Cache-Control': 'no-cache'})
            with OPENER.open(request, timeout=10) as response:
                https['status'] = response.status
                body = response.read(16385)
                https['verified_https_health'] = response.status == 200 and len(body) <= 16384 and json.loads(body).get('status') in ('healthy', 'ok')
        except Exception as error:
            https['transport_error'] = type(error).__name__
    report = {'observed_at': datetime.now(timezone.utc).isoformat(), 'observations': observations,
              **assessment, 'https': https, 'launch_approved': False,
              'scope': 'Public DoH CNAME routing snapshot plus optional bounded JSON HTTPS health. Provider ownership and certificate status must be checked separately; no launch approval.'}
    print(json.dumps(report, indent=2))
    print('OBSERVATION ONLY: a successful workflow is not launch approval.')
    print('PUBLIC APP ROUTING/HTTPS: ' + ('OBSERVED MATCH' if assessment['public_dns_ready'] and https['verified_https_health'] else 'BLOCKED OR UNVERIFIED') + '; this is not Railway ownership/TLS issuance acceptance or launch approval.')

if __name__ == '__main__':
    main()
