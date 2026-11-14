"""Add a Groq fallback model to AllBarka n8n AI workflows (offline JSON patch, no credentials).

Groq free-tier limits are per model per minute (gpt-oss-120b: about 8,000 tokens a minute). One website
chat used almost all of it, so the next message got HTTP 429. When the main model is rate limited the
patched workflow asks openai/gpt-oss-20b, which has its own separate budget.
Usage: python3 scripts/patch-n8n-ai-fallback.py <in.json> <out.json>
"""
import copy, json, sys, uuid

FALLBACK_MODEL = 'openai/gpt-oss-20b'

def add_fallback(wf, brain, extract, ctx_node, is_error_expr, cap_tokens=None):
    nodes = {n['name']: n for n in wf['nodes']}
    if brain not in nodes: return False
    b = nodes[brain]
    # An instant retry of a 429 only spends the same per-minute budget again.
    b['retryOnFail'] = False; b.pop('maxTries', None); b.pop('waitBetweenTries', None)
    check = {'parameters': {'conditions': {'options': {'caseSensitive': True, 'leftValue': '', 'typeValidation': 'loose', 'version': 3},
              'conditions': [{'id': str(uuid.uuid4()), 'leftValue': is_error_expr, 'rightValue': '', 'operator': {'type': 'boolean', 'operation': 'true', 'singleValue': True}}],
              'combinator': 'and'}, 'options': {}},
             'id': str(uuid.uuid4()), 'name': f'{brain} Rate Limited?', 'type': 'n8n-nodes-base.if', 'typeVersion': 2.3,
             'position': [b['position'][0] + 112, b['position'][1] + 176]}
    fb = copy.deepcopy(b); fb['id'] = str(uuid.uuid4()); fb['name'] = f'{brain} Fallback'
    fb['position'] = [b['position'][0] + 224, b['position'][1] + 352]
    fb['parameters']['jsonBody'] = "={{ JSON.stringify(Object.assign({}, $('" + ctx_node + "').first().json.aiBody, { model: '" + FALLBACK_MODEL + "' })) }}"
    wf['nodes'] += [check, fb]
    c = wf['connections']
    c[brain] = {'main': [[{'node': check['name'], 'type': 'main', 'index': 0}]]}
    c[check['name']] = {'main': [[{'node': fb['name'], 'type': 'main', 'index': 0}], [{'node': extract, 'type': 'main', 'index': 0}]]}
    c[fb['name']] = {'main': [[{'node': extract, 'type': 'main', 'index': 0}]]}
    if cap_tokens and ctx_node in nodes and 'jsCode' in nodes[ctx_node]['parameters']:
        code = nodes[ctx_node]['parameters']['jsCode']
        nodes[ctx_node]['parameters']['jsCode'] = code.replace('max_completion_tokens: 1200', f'max_completion_tokens: {cap_tokens}')
    return True

wf = json.load(open(sys.argv[1]))
done = []
# Standalone website chat (fullResponse: statusCode is on the item).
if add_fallback(wf, 'Website AI Brain', 'Extract Website Reply', 'Prepare Website Chat', '={{ $json.statusCode === 429 }}', cap_tokens=700): done.append('Website AI Brain')
# WhatsApp conversation engine (no fullResponse: an HTTP error arrives as $json.error).
if add_fallback(wf, 'AI Brain', 'Extract AI Reply1', 'Build AI Context1', "={{ !!$json.error && String($json.error.message || $json.error.httpCode || $json.error).includes('429') }}"): done.append('AI Brain')
json.dump(wf, open(sys.argv[2], 'w'), ensure_ascii=False, indent=2)
print('patched:', done)
