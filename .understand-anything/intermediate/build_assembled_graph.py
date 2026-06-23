import json, os, glob
from collections import OrderedDict

batch_dir = os.path.dirname(os.path.abspath(__file__))
batch_files = sorted(glob.glob(os.path.join(batch_dir, 'batch-*.json')))

all_nodes = OrderedDict()
all_edges = OrderedDict()

for bf in batch_files:
    with open(bf, 'r') as f:
        data = json.load(f)
    for node in data.get('nodes', []):
        all_nodes[node['id']] = node
    for edge in data.get('edges', []):
        key = (edge['source'], edge['target'], edge.get('type', ''))
        all_edges[key] = edge

# Remove dangling edges
valid_node_ids = set(all_nodes.keys())
clean_edges = OrderedDict()
for key, edge in all_edges.items():
    if edge['source'] in valid_node_ids and edge['target'] in valid_node_ids:
        clean_edges[key] = edge

nodes_list = list(all_nodes.values())
edges_list = list(clean_edges.values())

# Determine languages and frameworks
languages = set()
frameworks = set()
for n in nodes_list:
    fp = n.get('filePath', '')
    tags = n.get('tags', [])
    if fp.endswith('.ts') or fp.endswith('.tsx'):
        languages.add('TypeScript')
    elif fp.endswith('.js') or fp.endswith('.mjs'):
        languages.add('JavaScript')
    elif fp.endswith(('.css', '.scss')):
        languages.add('CSS/SCSS')
    elif fp.endswith('.html'):
        languages.add('HTML')
    elif fp.endswith('.json'):
        languages.add('JSON')
    elif fp.endswith(('.yml', '.yaml')):
        languages.add('YAML')
    elif fp.endswith('.md'):
        languages.add('Markdown')
    elif fp.endswith('.sh'):
        languages.add('Shell')

    for t in tags:
        tl = t.lower()
        if 'react' in tl:
            frameworks.add('React')
        if 'vite' in tl:
            frameworks.add('Vite')
        if 'tailwind' in tl:
            frameworks.add('Tailwind CSS')
        if 'zustand' in tl:
            frameworks.add('Zustand')
        if 'i18n' in tl or 'locale' in tl:
            frameworks.add('i18next')
        if 'echarts' in tl:
            frameworks.add('ECharts')

# Layer classification
def get_layer_for_path(fp):
    if fp.startswith('.github/'):
        return ('layer:ci-cd', 'CI/CD & Infrastructure', 'GitHub Actions workflows for CI/CD pipeline, deployment, and release automation.')
    if fp == 'README.md' or fp.startswith('docs/') or fp.startswith('.helloagents/'):
        return ('layer:documentation', 'Documentation & Plans', 'Project documentation, implementation plans, design specs, and task tracking.')
    if fp in ('index.html', 'manage.html'):
        return ('layer:app-shell', 'Application Shell', 'Root HTML entry points and Vite application bootstrap for the admin panel.')
    if fp.startswith('apps/admin-panel/') and fp.endswith('.html'):
        return ('layer:app-shell', 'Application Shell', 'Root HTML entry points and Vite application bootstrap for the admin panel.')
    if fp.endswith('main.tsx') or fp.endswith('manage-entry.tsx'):
        return ('layer:app-shell', 'Application Shell', 'Root HTML entry points and Vite application bootstrap for the admin panel.')
    if fp.startswith('apps/admin-panel/src/app/'):
        return ('layer:routing-and-auth', 'Routing & Authentication', 'Application routing, auth provider, route guards, layout shell, and auto-update components.')
    if fp.startswith('apps/admin-panel/src/stores/'):
        return ('layer:state-management', 'State Management', 'Zustand stores for theme, language, notifications, and disabled models.')
    if fp.startswith('apps/admin-panel/src/hooks/'):
        return ('layer:shared-hooks', 'Shared Hooks', 'General-purpose React hooks used across the application.')
    if fp.startswith('apps/admin-panel/src/lib/'):
        return ('layer:api-client', 'API Client Layer', 'HTTP client, connection utilities, API constants, and shared types for backend communication.')
    if fp.startswith('apps/admin-panel/src/i18n/'):
        return ('layer:i18n', 'Internationalization', 'i18next initialization, locale loaders, and translation resource files.')
    if fp.startswith('apps/admin-panel/src/types/'):
        return ('layer:types', 'Type Definitions', 'TypeScript type definitions for the entire application domain.')
    if fp.startswith('apps/admin-panel/src/utils/'):
        return ('layer:shared-utils', 'Shared Utilities', 'General-purpose utility functions for formatting, validation, encryption, and helpers.')
    if fp.startswith('apps/admin-panel/src/styles/'):
        return ('layer:styles', 'Styles & Theming', 'SCSS/CSS styles, design tokens, Tailwind configuration, and light/dark theme definitions.')
    if fp.startswith('apps/admin-panel/src/test/') or fp.startswith('e2e/') or fp.startswith('packages/test-utils/'):
        return ('layer:testing', 'Testing Infrastructure', 'Test setup files, E2E test config, and shared test utilities.')
    if fp.startswith('packages/api-client/'):
        return ('layer:api-client', 'API Client Layer', 'HTTP client, connection utilities, API constants, and shared types for backend communication.')
    if fp.startswith('packages/ui/'):
        return ('layer:ui-components', 'UI Component Library', 'Shared UI primitives (buttons, inputs, modals, tables), charts, overlays, feedback components, and theme provider.')
    if fp.startswith('packages/domain/'):
        return ('layer:domain-logic', 'Domain & Business Logic', 'Pure business logic for auth files, ccswitch import, quota, usage analytics, pricing, and model helpers.')
    if fp.startswith('packages/assets/'):
        return ('layer:assets-and-icons', 'Assets & Icons', 'Vendor SVG icons, brand logos, and shared static assets.')
    if fp.startswith('packages/i18n/'):
        return ('layer:i18n', 'Internationalization', 'i18next initialization, locale loaders, and translation resource files.')
    if fp.startswith('features/'):
        return ('layer:features', 'Feature Modules', 'Cross-page UI workflows including log viewer, OAuth, routing config editor, quota preview, proxy pool, monitor widgets, and model availability.')
    if fp.startswith('pages/'):
        return ('layer:pages', 'Route-Level Pages', 'Route-level screens and page-private components/hooks for each application view.')
    if fp.startswith('scripts/') or fp.startswith('tooling/'):
        return ('layer:tooling-and-build', 'Tooling & Build', 'Vite build configuration, plugins, scripts, and linting configuration.')
    if fp in ('playwright.config.ts', 'oxlintrc.json', '.vite.proxy.mjs', '.verify.mjs'):
        return ('layer:tooling-and-build', 'Tooling & Build', 'Vite build configuration, plugins, scripts, and linting configuration.')
    if fp in ('vite.config.ts', 'package.json', 'tsconfig.json', 'tsconfig.base.json'):
        return ('layer:tooling-and-build', 'Tooling & Build', 'Vite build configuration, plugins, scripts, and linting configuration.')
    if fp.endswith('vite.config.ts'):
        return ('layer:tooling-and-build', 'Tooling & Build', 'Vite build configuration, plugins, scripts, and linting configuration.')
    if fp.endswith('package.json') or fp.endswith('tsconfig.json') or fp.endswith('tsconfig.base.json'):
        return ('layer:tooling-and-build', 'Tooling & Build', 'Vite build configuration, plugins, scripts, and linting configuration.')
    return ('layer:root-config', 'Root Configuration', 'Root-level configuration files.')


file_nodes = [n for n in nodes_list if n.get('type') in ('file', 'config', 'document')]

layers_map = OrderedDict()

def add_node_to_layer(node_id, fp):
    lid, lname, ldesc = get_layer_for_path(fp)
    if lid not in layers_map:
        layers_map[lid] = {'id': lid, 'name': lname, 'description': ldesc, 'nodeIds': []}
    if node_id not in layers_map[lid]['nodeIds']:
        layers_map[lid]['nodeIds'].append(node_id)

# Assign file nodes
for n in file_nodes:
    add_node_to_layer(n['id'], n.get('filePath', ''))

# Assign non-file nodes by their filePath
for n in nodes_list:
    if n.get('type') in ('file', 'config', 'document'):
        continue
    fp = n.get('filePath', '')
    if fp:
        add_node_to_layer(n['id'], fp)

# Verify every file-level node is assigned (fallback to root-config)
for n in file_nodes:
    nid = n['id']
    found = False
    for layer in layers_map.values():
        if nid in layer['nodeIds']:
            found = True
            break
    if not found:
        add_node_to_layer(nid, n.get('filePath', ''))

# Sort layers
layer_order = [
    'layer:app-shell', 'layer:routing-and-auth', 'layer:pages', 'layer:features',
    'layer:state-management', 'layer:types', 'layer:api-client', 'layer:domain-logic',
    'layer:ui-components', 'layer:assets-and-icons', 'layer:shared-hooks',
    'layer:shared-utils', 'layer:i18n', 'layer:styles',
    'layer:tooling-and-build', 'layer:ci-cd',
    'layer:documentation', 'layer:testing', 'layer:root-config'
]
layers_list_sorted = [layers_map[lid] for lid in layer_order if lid in layers_map]

output = {
    'version': '1.0.0',
    'project': {
        'name': 'codeProxy',
        'languages': sorted(languages),
        'frameworks': sorted(frameworks),
        'description': 'Admin dashboard for CliRelay - a proxy server wrapping multiple AI services (Gemini CLI, ChatGPT Codex, Claude Code, etc.) as OpenAI/Gemini/Claude compatible APIs. Built with React 19, TypeScript, Vite, and Tailwind CSS.',
        'analyzedAt': '2026-06-09T13:00:00Z',
        'gitCommitHash': ''
    },
    'nodes': nodes_list,
    'edges': edges_list,
    'layers': layers_list_sorted
}

out_path = os.path.join(batch_dir, 'assembled-graph.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f'Written {len(nodes_list)} nodes, {len(edges_list)} edges, {len(layers_list_sorted)} layers to {out_path}')
print(f'Removed {len(all_edges) - len(clean_edges)} dangling edges')
