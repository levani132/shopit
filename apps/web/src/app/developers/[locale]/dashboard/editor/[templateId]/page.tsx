'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '../../../../../../lib/api';
import { TEMPLATE_SDK_DTS, REACT_DTS } from '../../../../../../data/template-sdk-dts';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
    </div>
  ),
});

// Configure Monaco TypeScript/JSX support before the editor mounts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleEditorWillMount(monaco: any) {
  const tsDefaults = monaco.languages.typescript.typescriptDefaults;
  const jsDefaults = monaco.languages.typescript.javascriptDefaults;

  const sharedCompilerOptions = {
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    allowJs: true,
    allowNonTsExtensions: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    skipLibCheck: true,
    noEmit: true,
  };

  tsDefaults.setCompilerOptions(sharedCompilerOptions);
  jsDefaults.setCompilerOptions(sharedCompilerOptions);

  // Semantic validation is now enabled — SDK + React type stubs are loaded
  // via addExtraLib so the editor can provide real type-checking.
  tsDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    diagnosticCodesToIgnore: [2307],
  });
  jsDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    diagnosticCodesToIgnore: [2307],
  });

  // ── Phase A: Add @shopit/template-sdk types ──
  tsDefaults.addExtraLib(TEMPLATE_SDK_DTS, 'file:///node_modules/@shopit/template-sdk/index.d.ts');
  jsDefaults.addExtraLib(TEMPLATE_SDK_DTS, 'file:///node_modules/@shopit/template-sdk/index.d.ts');

  // ── Phase B: Add React type stubs so JSX doesn't flag errors ──
  tsDefaults.addExtraLib(REACT_DTS, 'file:///node_modules/@types/react/index.d.ts');
  jsDefaults.addExtraLib(REACT_DTS, 'file:///node_modules/@types/react/index.d.ts');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateListing {
  id: string;
  _id?: string;
  templateSlug: string;
  name: { ka?: string; en?: string };
  status: string;
  githubRepo?: string;
}

interface RepoFile {
  path: string;
  type: string;
  size?: number;
}

interface CommitEntry {
  sha: string;
  message: string;
  author: string;
  date: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ── Preview builder helpers (shared with preview page) ──

const MOCK_STORE_JSON = JSON.stringify({
  name: 'Preview Store',
  nameLocalized: { en: 'Preview Store', ka: 'გადახედვის მაღაზია' },
  description: 'A beautifully designed store',
  logo: '', brandColor: '#1e40af', accentColor: '#3b82f6',
  phone: '+995 555 123 456', email: 'hello@store.ge', address: 'Tbilisi, Georgia',
  categories: [
    { _id: 'cat-1', name: 'Electronics', slug: 'electronics' },
    { _id: 'cat-2', name: 'Clothing', slug: 'clothing' },
  ],
});

const MOCK_PRODUCTS_JSON = JSON.stringify([
  { _id: 'p1', name: 'Wireless Headphones', price: 149.99, salePrice: 119.99, isOnSale: true, images: ['data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22 fill=%22%23e2e8f0%22%3E%3Crect width=%22400%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2220%22 fill=%22%2394a3b8%22%3EHeadphones%3C/text%3E%3C/svg%3E'], stock: 25 },
  { _id: 'p2', name: 'Cotton T-Shirt', price: 29.99, isOnSale: false, images: ['data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22 fill=%22%23e2e8f0%22%3E%3Crect width=%22400%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2220%22 fill=%22%2394a3b8%22%3ET-Shirt%3C/text%3E%3C/svg%3E'], stock: 100 },
  { _id: 'p3', name: 'Smart Watch Pro', price: 299.99, salePrice: 249.99, isOnSale: true, images: ['data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22 fill=%22%23e2e8f0%22%3E%3Crect width=%22400%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2220%22 fill=%22%2394a3b8%22%3EWatch%3C/text%3E%3C/svg%3E'], stock: 15 },
  { _id: 'p4', name: 'Ceramic Vase', price: 45.0, isOnSale: false, images: ['data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22 fill=%22%23e2e8f0%22%3E%3Crect width=%22400%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2220%22 fill=%22%2394a3b8%22%3EVase%3C/text%3E%3C/svg%3E'], stock: 40 },
]);

function cleanSourceForPreview(source: string): string {
  return source
    .replace(/^import\s[\s\S]*?from\s+['"][^'"]*['"];?\s*$/gm, '')
    .replace(/^import\s+['"][^'"]*['"];?\s*$/gm, '')
    .replace(/export\s+default\s+function\s/g, 'function ')
    .replace(/export\s+function\s/g, 'function ')
    .replace(/export\s+const\s/g, 'const ');
}

function findComponentName(source: string): string | null {
  const m = source.match(/(?:export\s+(?:default\s+)?)?function\s+([A-Z]\w*)/);
  return m ? m[1] : null;
}

function escForTpl(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

function buildPreviewSrcdoc(
  pageSource: string,
  headerSource: string,
  footerSource: string,
  wrapperSource: string,
  pageComponentName: string,
  headerComponentName: string | null,
  footerComponentName: string | null,
  wrapperComponentName: string | null,
  locale: string,
): string {
  const cp = escForTpl(cleanSourceForPreview(pageSource));
  const ch = headerSource ? escForTpl(cleanSourceForPreview(headerSource)) : '';
  const cf = footerSource ? escForTpl(cleanSourceForPreview(footerSource)) : '';
  const cw = wrapperSource ? escForTpl(cleanSourceForPreview(wrapperSource)) : '';

  const hr = headerComponentName ? `<${headerComponentName} store={store} locale={locale} />` : '';
  const fr = footerComponentName ? `<${footerComponentName} store={store} locale={locale} />` : '';
  const pr = `<${pageComponentName} store={store} products={products} locale={locale} subdomain="preview-store" />`;

  const body = wrapperComponentName
    ? `<${wrapperComponentName} store={store} accentColors={{}} locale={locale}>${hr}<main style={{flex:1}}>${pr}</main>${fr}</${wrapperComponentName}>`
    : `<div style={{minHeight:'100vh',display:'flex',flexDirection:'column'}}>${hr}<main style={{flex:1}}>${pr}</main>${fr}</div>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
#__error{display:none;padding:2rem;color:#dc2626;font-size:14px;white-space:pre-wrap;font-family:monospace}
#__loading{display:flex;align-items:center;justify-content:center;height:100vh}
#__loading .spinner{width:24px;height:24px;border:3px solid #e2e8f0;border-top-color:#10b981;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}</style></head><body>
<div id="root"><div id="__loading"><div class="spinner"></div></div></div>
<div id="__error"></div>
<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
<script>
function PriceDisplay(props){if(props.isOnSale&&props.salePrice!=null){return React.createElement('span',null,React.createElement('span',{style:{color:'#ef4444',fontWeight:'bold'}},props.salePrice.toFixed(2)+' \\u20BE'),' ',React.createElement('span',{style:{textDecoration:'line-through',color:'#94a3b8',fontSize:'0.875em'}},props.price.toFixed(2)+' \\u20BE'));}return React.createElement('span',{style:{fontWeight:'bold'}},(props.price||0).toFixed(2)+' \\u20BE');}
function defineTemplate(c){return c;}
var store=${MOCK_STORE_JSON};var products=${MOCK_PRODUCTS_JSON};var locale='${locale}';
</script>
<script type="text/babel" data-presets="react,typescript">
${cw}\n${ch}\n${cf}\n${cp}
try{const App=()=>(${body});ReactDOM.createRoot(document.getElementById('root')).render(<App/>);}catch(err){document.getElementById('root').style.display='none';var errEl=document.getElementById('__error');errEl.style.display='block';errEl.textContent='Render error: '+err.message;}
</script></body></html>`;
}

// ── End preview builder helpers ──

function languageForFile(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    svg: 'xml',
    sh: 'shell',
    bash: 'shell',
    py: 'python',
    rs: 'rust',
    go: 'go',
    sql: 'sql',
    graphql: 'graphql',
    dockerfile: 'dockerfile',
    toml: 'ini',
    env: 'ini',
  };
  if (path.toLowerCase() === 'dockerfile') return 'dockerfile';
  return map[ext] || 'plaintext';
}

function FileIcon({ path }: { path: string }) {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const s = 'w-3.5 h-3.5 flex-shrink-0';
  if (ext === 'tsx' || ext === 'jsx') {
    const c = ext === 'tsx' ? '#61dafb' : '#f0db4f';
    return (
      <svg className={s} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="2.2" fill={c} />
        <ellipse cx="12" cy="12" rx="10" ry="4.5" stroke={c} strokeWidth="1.2" />
        <ellipse cx="12" cy="12" rx="10" ry="4.5" stroke={c} strokeWidth="1.2" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4.5" stroke={c} strokeWidth="1.2" transform="rotate(120 12 12)" />
      </svg>
    );
  }
  if (ext === 'ts') {
    return (
      <svg className={s} viewBox="0 0 24 24">
        <rect x="1" y="1" width="22" height="22" rx="3" fill="#3178c6" />
        <text x="12" y="17" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="sans-serif">TS</text>
      </svg>
    );
  }
  if (ext === 'js' || ext === 'mjs' || ext === 'cjs') {
    return (
      <svg className={s} viewBox="0 0 24 24">
        <rect x="1" y="1" width="22" height="22" rx="3" fill="#f0db4f" />
        <text x="12" y="17" textAnchor="middle" fill="#323330" fontSize="12" fontWeight="bold" fontFamily="sans-serif">JS</text>
      </svg>
    );
  }
  if (ext === 'json') {
    return (
      <svg className={s} viewBox="0 0 24 24" fill="none">
        <path d="M8 3C5.5 3 4 4.5 4 7v3c0 1-.5 2-2 2 1.5 0 2 1 2 2v3c0 2.5 1.5 4 4 4" stroke="#cbcb41" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 3c2.5 0 4 1.5 4 4v3c0 1 .5 2 2 2-1.5 0-2 1-2 2v3c0 2.5-1.5 4-4 4" stroke="#cbcb41" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (ext === 'css') {
    return (
      <svg className={s} viewBox="0 0 24 24">
        <rect x="1" y="1" width="22" height="22" rx="3" fill="#563d7c" />
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">CSS</text>
      </svg>
    );
  }
  if (ext === 'scss' || ext === 'sass') {
    return (
      <svg className={s} viewBox="0 0 24 24">
        <rect x="1" y="1" width="22" height="22" rx="3" fill="#cc6699" />
        <text x="12" y="17" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="sans-serif">S</text>
      </svg>
    );
  }
  if (ext === 'html' || ext === 'htm') {
    return (
      <svg className={s} viewBox="0 0 24 24" fill="none" stroke="#e44d26" strokeWidth="2" strokeLinecap="round">
        <path d="M7 7L3 12l4 5M17 7l4 5-4 5M14 4l-4 16" />
      </svg>
    );
  }
  if (ext === 'md' || ext === 'mdx') {
    return (
      <svg className={s} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M7 15V9l2.5 3L12 9v6M17 9v6l-2-3" />
      </svg>
    );
  }
  if (ext === 'svg') {
    return (
      <svg className={s} viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    );
  }
  return (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Tree builder
// ---------------------------------------------------------------------------

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildTree(files: RepoFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  const dirs = new Map<string, TreeNode>();

  for (const f of files) {
    const parts = f.path.split('/');
    let current = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;

      if (isLast) {
        current.push({ name: part, path: f.path, isDir: false, children: [] });
      } else {
        let dir = dirs.get(currentPath);
        if (!dir) {
          dir = { name: part, path: currentPath, isDir: true, children: [] };
          dirs.set(currentPath, dir);
          current.push(dir);
        }
        current = dir.children;
      }
    }
  }

  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => n.isDir && sort(n.children));
  };
  sort(root);
  return root;
}

// ---------------------------------------------------------------------------
// Sidebar tab types
// ---------------------------------------------------------------------------

type SideTab = 'files' | 'git' | 'npm';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TemplateEditorPage() {
  const t = useTranslations('developer');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const templateId = params?.templateId as string;

  // Template & repo state
  const [template, setTemplate] = useState<TemplateListing | null>(null);
  const [repoFiles, setRepoFiles] = useState<RepoFile[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor state
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [, setFileSha] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [modifiedFiles, setModifiedFiles] = useState<Map<string, string>>(new Map());
  const [openTabs, setOpenTabs] = useState<string[]>([]);

  // Sidebar
  const [sideTab, setSideTab] = useState<SideTab>('files');
  const [fileSearch, setFileSearch] = useState('');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  // Git state
  const [commitMsg, setCommitMsg] = useState('');
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [commits, setCommits] = useState<CommitEntry[]>([]);

  // Preview panel
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(420);
  const resizing = useRef(false);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [previewPage, setPreviewPage] = useState('home');
  const [previewSrcdoc, setPreviewSrcdoc] = useState('');
  const previewBuildTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cache of fetched (committed) file contents so we don't re-fetch on every rebuild
  const fetchedFilesCache = useRef<Map<string, string>>(new Map());

  // ── File management (Phase C) ──
  const [newFileDialog, setNewFileDialog] = useState<{ parentDir: string } | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [renameDialog, setRenameDialog] = useState<{ oldPath: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; path: string; isDir: boolean;
  } | null>(null);
  // Track files created locally (not yet committed)
  const [newFiles, setNewFiles] = useState<Set<string>>(new Set());
  // Track files queued for deletion (committed on next push)
  const [pendingDeletions, setPendingDeletions] = useState<Set<string>>(new Set());

  // ── NPM search (Phase E) ──
  const [npmQuery, setNpmQuery] = useState('');
  const [npmResults, setNpmResults] = useState<{ name: string; version: string; description: string }[]>([]);
  const [npmSearching, setNpmSearching] = useState(false);
  const [installedPkgs, setInstalledPkgs] = useState<string[]>([]);

  // ── ATA — Automatic Type Acquisition (Phase D) ──
  const ataLoadedRef = useRef<Set<string>>(new Set());
  const monacoRef = useRef<unknown>(null);

  const getName = (name?: { ka?: string; en?: string }) => {
    if (!name) return '';
    return (locale === 'ka' ? name.ka : name.en) || name.en || name.ka || '';
  };

  // ---------------------------------------------------------------------------
  // Load template & file list
  // ---------------------------------------------------------------------------

  const loadTemplate = useCallback(async () => {
    try {
      const data = await api.get(`/developers/templates/${templateId}`);
      const listing = data.listing || data;
      setTemplate(listing);

      if (listing.githubRepo) {
        const id = listing.id || listing._id;
        const filesData = await api.get(`/developers/templates/${id}/git/files`);
        const filesList: RepoFile[] = Array.isArray(filesData) ? filesData : filesData.files || [];
        setRepoFiles(filesList);
        setTree(buildTree(filesList));

        // Expand top-level dirs
        const topDirs = new Set<string>();
        filesList.forEach((f) => {
          const first = f.path.split('/')[0];
          if (f.path.includes('/')) topDirs.add(first);
        });
        setExpandedDirs(topDirs);

        // Load commit history
        try {
          const logData = await api.get(`/developers/templates/${id}/git/log`);
          setCommits(Array.isArray(logData) ? logData : []);
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.error('Failed to load template:', err);
      setError(t('editorLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [templateId, t]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  // ---------------------------------------------------------------------------
  // Load individual file content
  // ---------------------------------------------------------------------------

  const loadFileContent = useCallback(
    async (path: string) => {
      // If file is in modified buffer, use that
      if (modifiedFiles.has(path)) {
        setFileContent(modifiedFiles.get(path) ?? '');
        setActiveFile(path);
        if (!openTabs.includes(path)) setOpenTabs((prev) => [...prev, path]);
        return;
      }

      setLoadingFile(true);
      try {
        const id = template?.id || template?._id;
        const data = await api.get(
          `/developers/templates/${id}/git/file?path=${encodeURIComponent(path)}`,
        );
        setFileContent(data.content ?? '');
        setFileSha(data.sha ?? '');
        setActiveFile(path);
        if (!openTabs.includes(path)) setOpenTabs((prev) => [...prev, path]);
      } catch (err) {
        console.error('Failed to load file:', err);
      } finally {
        setLoadingFile(false);
      }
    },
    [template, modifiedFiles, openTabs],
  );

  // ---------------------------------------------------------------------------
  // Handle editor changes
  // ---------------------------------------------------------------------------

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (!activeFile || value === undefined) return;
      setFileContent(value);
      setModifiedFiles((prev) => new Map(prev).set(activeFile, value));
    },
    [activeFile],
  );

  // ---------------------------------------------------------------------------
  // Tab management
  // ---------------------------------------------------------------------------

  const closeTab = useCallback(
    (path: string) => {
      const newTabs = openTabs.filter((t) => t !== path);
      setOpenTabs(newTabs);
      if (activeFile === path) {
        if (newTabs.length > 0) {
          loadFileContent(newTabs[newTabs.length - 1]);
        } else {
          setActiveFile(null);
          setFileContent('');
        }
      }
    },
    [openTabs, activeFile, loadFileContent],
  );

  // ---------------------------------------------------------------------------
  // File management — create, rename, delete (Phase C)
  // ---------------------------------------------------------------------------

  const handleCreateFile = useCallback(
    (parentDir: string, fileName: string) => {
      if (!fileName.trim()) return;
      const newPath = parentDir ? `${parentDir}/${fileName.trim()}` : fileName.trim();

      // Check if file already exists in repo or modified buffer
      if (repoFiles.some((f) => f.path === newPath) || modifiedFiles.has(newPath)) return;

      // Add to modified buffer with empty content
      setModifiedFiles((prev) => new Map(prev).set(newPath, ''));
      setNewFiles((prev) => new Set(prev).add(newPath));

      // Add to repo files so it appears in the tree
      const updatedFiles = [...repoFiles, { path: newPath, type: 'blob' }];
      setRepoFiles(updatedFiles);
      setTree(buildTree(updatedFiles));

      // Open the new file
      setFileContent('');
      setActiveFile(newPath);
      if (!openTabs.includes(newPath)) setOpenTabs((prev) => [...prev, newPath]);

      // Expand parent directories
      if (parentDir) {
        setExpandedDirs((prev) => {
          const next = new Set(prev);
          parentDir.split('/').reduce((acc, dir) => {
            const path = acc ? `${acc}/${dir}` : dir;
            next.add(path);
            return path;
          }, '');
          return next;
        });
      }

      setNewFileDialog(null);
      setNewFileName('');
    },
    [repoFiles, modifiedFiles, openTabs],
  );

  const handleRenameFile = useCallback(
    (oldPath: string, newName: string) => {
      if (!newName.trim()) return;
      const parts = oldPath.split('/');
      parts[parts.length - 1] = newName.trim();
      const newPath = parts.join('/');

      if (newPath === oldPath) return;
      if (repoFiles.some((f) => f.path === newPath)) return;

      // Get the old content
      const content = modifiedFiles.get(oldPath) ?? fileContent;

      // Remove old file, add new file
      setModifiedFiles((prev) => {
        const next = new Map(prev);
        next.delete(oldPath);
        next.set(newPath, content);
        return next;
      });

      // Queue the old file for deletion (if it was a committed file)
      if (!newFiles.has(oldPath)) {
        setPendingDeletions((prev) => new Set(prev).add(oldPath));
      }
      setNewFiles((prev) => {
        const next = new Set(prev);
        next.delete(oldPath);
        next.add(newPath);
        return next;
      });

      // Update file tree
      const updatedFiles = repoFiles
        .filter((f) => f.path !== oldPath)
        .concat({ path: newPath, type: 'blob' });
      setRepoFiles(updatedFiles);
      setTree(buildTree(updatedFiles));

      // Update tabs
      setOpenTabs((prev) => prev.map((t) => (t === oldPath ? newPath : t)));
      if (activeFile === oldPath) {
        setActiveFile(newPath);
        setFileContent(content);
      }

      setRenameDialog(null);
      setRenameValue('');
    },
    [repoFiles, modifiedFiles, activeFile, fileContent, newFiles],
  );

  const handleDeleteFile = useCallback(
    (path: string) => {
      // Queue for deletion on next commit (if it was a committed file)
      if (!newFiles.has(path)) {
        setPendingDeletions((prev) => new Set(prev).add(path));
      }

      // Remove from modified buffer and new files
      setModifiedFiles((prev) => {
        const next = new Map(prev);
        next.delete(path);
        return next;
      });
      setNewFiles((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });

      // Update file tree
      const updatedFiles = repoFiles.filter((f) => f.path !== path);
      setRepoFiles(updatedFiles);
      setTree(buildTree(updatedFiles));

      // Close tab if open
      closeTab(path);

      setDeleteConfirm(null);
    },
    [repoFiles, newFiles, closeTab],
  );

  // ---------------------------------------------------------------------------
  // NPM package search (Phase E)
  // ---------------------------------------------------------------------------

  const searchNpm = useCallback(async (query: string) => {
    if (!query.trim()) {
      setNpmResults([]);
      return;
    }
    setNpmSearching(true);
    try {
      const res = await fetch(
        `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=15`,
      );
      const data = await res.json();
      setNpmResults(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data.objects || []).map((o: any) => ({
          name: o.package.name,
          version: o.package.version,
          description: o.package.description || '',
        })),
      );
    } catch {
      setNpmResults([]);
    } finally {
      setNpmSearching(false);
    }
  }, []);

  const installNpmPackage = useCallback(
    (pkgName: string, pkgVersion: string) => {
      // Add package to the template's package.json in the editor buffer
      const pkgJsonPath = 'package.json';
      let pkgContent = modifiedFiles.get(pkgJsonPath) || '';

      if (!pkgContent) {
        // Try to find it from fetched cache or build a minimal one
        pkgContent = fetchedFilesCache.current.get(pkgJsonPath) || '{}';
      }

      try {
        const pkg = JSON.parse(pkgContent);
        if (!pkg.dependencies) pkg.dependencies = {};
        pkg.dependencies[pkgName] = `^${pkgVersion}`;

        // Sort dependencies
        const sorted: Record<string, string> = {};
        Object.keys(pkg.dependencies).sort().forEach((k) => {
          sorted[k] = pkg.dependencies[k];
        });
        pkg.dependencies = sorted;

        const newContent = JSON.stringify(pkg, null, 2) + '\n';
        setModifiedFiles((prev) => new Map(prev).set(pkgJsonPath, newContent));

        // Make sure package.json is in the repo files list
        if (!repoFiles.some((f) => f.path === pkgJsonPath)) {
          const updated = [...repoFiles, { path: pkgJsonPath, type: 'blob' }];
          setRepoFiles(updated);
          setTree(buildTree(updated));
        }

        setInstalledPkgs((prev) => [...prev, pkgName]);

        // Trigger ATA to fetch types for the new package
        fetchTypesForPackage(pkgName);
      } catch {
        console.error('Failed to update package.json');
      }
    },
    [modifiedFiles, repoFiles],
  );

  // ---------------------------------------------------------------------------
  // ATA — lightweight Automatic Type Acquisition (Phase D)
  // Scans imports and fetches .d.ts from CDN
  // ---------------------------------------------------------------------------

  const fetchTypesForPackage = useCallback(async (pkgName: string) => {
    if (ataLoadedRef.current.has(pkgName)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monaco = monacoRef.current as any;
    if (!monaco) return;

    // Skip built-in / relative imports
    if (pkgName.startsWith('.') || pkgName.startsWith('/')) return;
    // Skip our SDK — already loaded
    if (pkgName === '@shopit/template-sdk') return;
    // Skip react — already have stubs
    if (pkgName === 'react' || pkgName === 'react-dom' || pkgName === 'react-dom/client') return;

    ataLoadedRef.current.add(pkgName);

    // Try @types/{pkg} first, then the package itself
    const typesPackage = pkgName.startsWith('@')
      ? `@types/${pkgName.replace('@', '').replace('/', '__')}`
      : `@types/${pkgName}`;

    const urls = [
      `https://cdn.jsdelivr.net/npm/${typesPackage}/index.d.ts`,
      `https://cdn.jsdelivr.net/npm/${pkgName}/dist/index.d.ts`,
      `https://cdn.jsdelivr.net/npm/${pkgName}/index.d.ts`,
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const text = await res.text();
        if (!text.includes('export') && !text.includes('declare')) continue;

        const dts = `declare module '${pkgName}' {\n${text}\n}`;
        monaco.languages.typescript.typescriptDefaults.addExtraLib(
          dts,
          `file:///node_modules/${pkgName}/index.d.ts`,
        );
        monaco.languages.typescript.javascriptDefaults.addExtraLib(
          dts,
          `file:///node_modules/${pkgName}/index.d.ts`,
        );
        break;
      } catch {
        // try next URL
      }
    }
  }, []);

  // Scan current file imports and fetch types (debounced)
  useEffect(() => {
    if (!fileContent || !monacoRef.current) return;
    const timer = setTimeout(() => {
      const importRegex = /import\s+[\s\S]*?from\s+['"]([^'"./][^'"]*)['"]/g;
      let match;
      while ((match = importRegex.exec(fileContent))) {
        const pkg = match[1];
        // Normalize scoped package: @scope/pkg/sub → @scope/pkg
        const normalized = pkg.startsWith('@')
          ? pkg.split('/').slice(0, 2).join('/')
          : pkg.split('/')[0];
        fetchTypesForPackage(normalized);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [fileContent, fetchTypesForPackage]);

  // ---------------------------------------------------------------------------
  // Commit & push
  // ---------------------------------------------------------------------------

  const handleCommit = useCallback(async () => {
    if (modifiedFiles.size === 0 && pendingDeletions.size === 0) return;
    if (!commitMsg.trim()) return;

    setCommitting(true);
    setCommitResult(null);
    try {
      const id = template?.id || template?._id;
      const files = Array.from(modifiedFiles.entries()).map(([path, content]) => ({
        path,
        content,
      }));
      const deletions = Array.from(pendingDeletions);
      await api.post(`/developers/templates/${id}/git/commit`, {
        files,
        message: commitMsg.trim(),
        deletions: deletions.length > 0 ? deletions : undefined,
      });
      setCommitResult({ ok: true, msg: t('commitSuccess') });
      setModifiedFiles(new Map());
      setPendingDeletions(new Set());
      setNewFiles(new Set());
      setCommitMsg('');
      // Refresh commit log
      const logData = await api.get(`/developers/templates/${id}/git/log`);
      setCommits(Array.isArray(logData) ? logData : []);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setCommitResult({ ok: false, msg: apiErr?.message || t('commitFailed') });
    } finally {
      setCommitting(false);
    }
  }, [modifiedFiles, pendingDeletions, commitMsg, template, t]);

  // ---------------------------------------------------------------------------
  // Preview resize (drag handle)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setPreviewWidth(Math.max(280, Math.min(newWidth, window.innerWidth * 0.6)));
    };
    const onMouseUp = () => {
      resizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Re-enable iframe pointer events
      if (previewIframeRef.current) {
        previewIframeRef.current.style.pointerEvents = '';
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // JSX / TSX rich syntax highlighting via monaco-jsx-highlighter
  // ---------------------------------------------------------------------------

  const jsxHighlighterRef = useRef<{ dispose?: () => void } | null>(null);

  const handleEditorDidMount = useCallback(
    async (editor: unknown, monaco: unknown) => {
      // Store monaco instance for ATA (Phase D)
      monacoRef.current = monaco;

      const ext = activeFile?.split('.').pop()?.toLowerCase();
      if (!ext || !['tsx', 'jsx', 'ts', 'js'].includes(ext)) return;

      // Phase F: Dispose previous highlighter to avoid stale decorations
      if (jsxHighlighterRef.current?.dispose) {
        try { jsxHighlighterRef.current.dispose(); } catch { /* ignore */ }
        jsxHighlighterRef.current = null;
      }

      try {
        const [{ default: MonacoJsxHighlighter }, { parse }, traverseModule] =
          await Promise.all([
            import('monaco-jsx-highlighter'),
            import('@babel/parser'),
            import('@babel/traverse'),
          ]);

        // Handle CJS / ESM interop for @babel/traverse
        const traverse =
          typeof (traverseModule as Record<string, unknown>).default === 'function'
            ? (traverseModule as Record<string, unknown>).default
            : traverseModule;

        // Phase F: Robust parse wrapper — catches all errors, returns empty AST on failure
        const babelParse = (code: string) => {
          try {
            return parse(code, {
              sourceType: 'module',
              plugins: ['jsx', 'typescript'],
              errorRecovery: true,
            });
          } catch {
            // Return a minimal empty AST so the highlighter doesn't crash
            return { type: 'File', program: { type: 'Program', body: [], sourceType: 'module' } };
          }
        };

        const highlighter = new MonacoJsxHighlighter(
          monaco,
          babelParse,
          traverse,
          editor,
        );
        highlighter.highlightOnDidChangeModelContent(100);
        highlighter.addJSXCommentCommand();
        jsxHighlighterRef.current = highlighter;
      } catch (e) {
        console.warn('JSX highlighter init failed:', e);
      }
    },
    [activeFile],
  );

  // Inject CSS for monaco-jsx-highlighter decoration classes
  useEffect(() => {
    const id = 'monaco-jsx-highlighter-css';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      /* JSX tag names */
      .JSXElement.JSXIdentifier { color: #4ec9b0 !important; }
      .JSXOpeningElement.JSXIdentifier { color: #4ec9b0 !important; }
      .JSXClosingElement.JSXIdentifier { color: #4ec9b0 !important; }
      /* JSX attribute names */
      .JSXAttribute.JSXIdentifier { color: #9cdcfe !important; }
      /* JSX brackets < > </ /> */
      .JSXElement.JSXBracket { color: #808080 !important; }
      .JSXOpeningElement.JSXBracket { color: #808080 !important; }
      .JSXClosingElement.JSXBracket { color: #808080 !important; }
      .JSXOpeningFragment.JSXBracket { color: #808080 !important; }
      .JSXClosingFragment.JSXBracket { color: #808080 !important; }
      /* JSX expression containers { } */
      .JSXExpressionContainer.JSXBracket { color: #c586c0 !important; }
      .JSXSpreadChild.JSXBracket { color: #c586c0 !important; }
      .JSXSpreadAttribute.JSXBracket { color: #c586c0 !important; }
      /* JSX text content */
      .JSXElement.JSXText { color: #d4d4d4 !important; }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  // ---------------------------------------------------------------------------
  // Ctrl+S shortcut — switches to git tab so user can commit
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (modifiedFiles.size > 0 || pendingDeletions.size > 0) {
          setSideTab('git');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modifiedFiles.size, pendingDeletions.size]);

  // ---------------------------------------------------------------------------
  // Live preview builder — uses modified (unsaved) files, falls back to API
  // ---------------------------------------------------------------------------

  const buildPreview = useCallback(async () => {
    if (!template?.githubRepo) return;
    const id = template.id || template._id;

    // Helper: get file content — editor buffer first, cache second, API third
    const getSource = async (path: string): Promise<string> => {
      if (modifiedFiles.has(path)) return modifiedFiles.get(path)!;
      if (fetchedFilesCache.current.has(path)) return fetchedFilesCache.current.get(path)!;
      try {
        const d = await api.get(
          `/developers/templates/${id}/git/file?path=${encodeURIComponent(path)}`,
        );
        const content = (d.content as string) || '';
        fetchedFilesCache.current.set(path, content);
        return content;
      } catch {
        return '';
      }
    };

    try {
      // Classify repo files
      const pageFiles = repoFiles.filter(
        (f) => f.path.startsWith('src/pages/') && /\.(tsx|jsx)$/.test(f.path),
      );
      const layoutFiles = repoFiles.filter(
        (f) => f.path.startsWith('src/layout/') && /\.(tsx|jsx)$/.test(f.path),
      );

      const pageMap: Record<string, string> = {};
      for (const f of pageFiles) {
        const n = (f.path.split('/').pop() || '').replace(/Page\.(tsx|jsx)$/, '').toLowerCase();
        if (n) pageMap[n] = f.path;
      }
      const layoutMap: Record<string, string> = {};
      for (const f of layoutFiles) {
        const n = (f.path.split('/').pop() || '').replace(/\.(tsx|jsx)$/, '').toLowerCase();
        if (n) layoutMap[n] = f.path;
      }

      const targetPage = pageMap[previewPage] || pageMap['home'] || pageFiles[0]?.path;
      if (!targetPage) return;

      const [pageSrc, headerSrc, footerSrc, wrapperSrc] = await Promise.all([
        getSource(targetPage),
        layoutMap['header'] ? getSource(layoutMap['header']) : Promise.resolve(''),
        layoutMap['footer'] ? getSource(layoutMap['footer']) : Promise.resolve(''),
        layoutMap['wrapper'] ? getSource(layoutMap['wrapper']) : Promise.resolve(''),
      ]);

      const html = buildPreviewSrcdoc(
        pageSrc, headerSrc, footerSrc, wrapperSrc,
        findComponentName(pageSrc) || 'Page',
        headerSrc ? findComponentName(headerSrc) : null,
        footerSrc ? findComponentName(footerSrc) : null,
        wrapperSrc ? findComponentName(wrapperSrc) : null,
        locale,
      );

      setPreviewSrcdoc(html);
    } catch (e) {
      console.error('Preview build failed:', e);
    }
  }, [template, repoFiles, modifiedFiles, previewPage, locale]);

  // Rebuild preview on open, page change, and file edits (debounced)
  useEffect(() => {
    if (!previewOpen) return;
    if (previewBuildTimer.current) clearTimeout(previewBuildTimer.current);
    previewBuildTimer.current = setTimeout(() => {
      buildPreview();
    }, 600);
    return () => {
      if (previewBuildTimer.current) clearTimeout(previewBuildTimer.current);
    };
  }, [previewOpen, buildPreview]);

  // ---------------------------------------------------------------------------
  // File tree filtering
  // ---------------------------------------------------------------------------

  const filteredTree = useCallback(
    (nodes: TreeNode[]): TreeNode[] => {
      if (!fileSearch) return nodes;
      const q = fileSearch.toLowerCase();
      return nodes
        .map((node) => {
          if (node.isDir) {
            const children = filteredTree(node.children);
            if (children.length > 0) return { ...node, children };
            return null;
          }
          return node.name.toLowerCase().includes(q) ? node : null;
        })
        .filter(Boolean) as TreeNode[];
    },
    [fileSearch],
  );

  // ---------------------------------------------------------------------------
  // Toggle dir
  // ---------------------------------------------------------------------------

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Render file tree (recursive)
  // ---------------------------------------------------------------------------

  const renderTree = (nodes: TreeNode[], depth = 0) => {
    return nodes.map((node) => {
      if (node.isDir) {
        const isOpen = expandedDirs.has(node.path);
        return (
          <div key={node.path}>
            <button
              onClick={() => toggleDir(node.path)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, path: node.path, isDir: true });
              }}
              className="w-full flex items-center gap-1 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded px-1 transition-colors"
              style={{ paddingLeft: `${depth * 12 + 4}px` }}
            >
              <svg
                className={`w-3 h-3 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <svg className="w-3.5 h-3.5 flex-shrink-0 text-yellow-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="truncate">{node.name}</span>
            </button>
            {isOpen && renderTree(node.children, depth + 1)}
          </div>
        );
      }

      const isActive = activeFile === node.path;
      const isModified = modifiedFiles.has(node.path);
      const isNew = newFiles.has(node.path);
      const isDeleted = pendingDeletions.has(node.path);
      return (
        <button
          key={node.path}
          onClick={() => loadFileContent(node.path)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, path: node.path, isDir: false });
          }}
          className={`w-full flex items-center gap-1.5 py-1 text-xs rounded px-1 transition-colors ${
            isActive
              ? 'bg-emerald-500/20 text-emerald-300'
              : isDeleted
                ? 'text-red-400 hover:bg-white/5 line-through'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
          style={{ paddingLeft: `${depth * 12 + 16}px` }}
        >
          <FileIcon path={node.path} />
          <span className="truncate">{node.name}</span>
          {isNew && <span className="ml-auto text-[9px] text-green-400 font-bold flex-shrink-0">N</span>}
          {isModified && !isNew && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
        </button>
      );
    });
  };

  // ---------------------------------------------------------------------------
  // Loading / error states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center">
        <div className="max-w-md p-6 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-center">
          <p className="mb-4">{error}</p>
          <button
            onClick={() => router.push(`/${locale}/dashboard/templates`)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm"
          >
            {t('backToTemplates')}
          </button>
        </div>
      </div>
    );
  }

  // No repo connected — prompt to create one
  if (template && !template.githubRepo) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gray-500/20 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">{t('noRepoConnected')}</h2>
          <p className="text-gray-400 text-sm">{t('connectRepoFirst')}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push(`/${locale}/dashboard/templates`)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm"
            >
              {t('backToTemplates')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main editor UI — fixed fullscreen overlay (covers dashboard sidebar)
  // ---------------------------------------------------------------------------

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1e1e1e] text-white">
      {/* ─── Top toolbar ─── */}
      <div className="h-10 flex items-center justify-between px-3 bg-[#252526] border-b border-[#3c3c3c] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${locale}/dashboard/templates`)}
            className="text-gray-400 hover:text-white transition-colors p-1"
            title={t('backToTemplates')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <span className="text-sm text-gray-300 font-medium truncate">
            {getName(template?.name)}
          </span>
          {template?.status && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                template.status === 'published'
                  ? 'bg-green-500/20 text-green-400'
                  : template.status === 'draft'
                    ? 'bg-gray-500/20 text-gray-400'
                    : 'bg-yellow-500/20 text-yellow-400'
              }`}
            >
              {t(`status_${template.status}`)}
            </span>
          )}
          {template?.githubRepo && (
            <a
              href={template.githubRepo}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-300 transition-colors"
              title={t('repoInfo')}
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </a>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(modifiedFiles.size > 0 || pendingDeletions.size > 0) && (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded mr-2">
              {modifiedFiles.size + pendingDeletions.size} {t('modifiedFiles').toLowerCase()}
            </span>
          )}
          <button
            onClick={() => setPreviewOpen(!previewOpen)}
            className={`p-1.5 rounded transition-colors ${
              previewOpen ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title={t('preview')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ─── Body ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Activity bar (icon strip) ─── */}
        <div className="w-12 flex-shrink-0 bg-[#252526] border-r border-[#3c3c3c] flex flex-col items-center pt-2 gap-2">
          <button
            onClick={() => setSideTab('files')}
            className={`p-2 rounded transition-colors ${
              sideTab === 'files' ? 'text-white bg-white/10' : 'text-gray-500 hover:text-gray-300'
            }`}
            title={t('fileExplorer')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </button>
          <button
            onClick={() => setSideTab('git')}
            className={`p-2 rounded transition-colors relative ${
              sideTab === 'git' ? 'text-white bg-white/10' : 'text-gray-500 hover:text-gray-300'
            }`}
            title={t('gitActions')}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="7" cy="5" r="2.5" />
              <circle cx="17" cy="5" r="2.5" />
              <circle cx="7" cy="19" r="2.5" />
              <path d="M7 7.5v9M17 7.5c0 4.5-10 4.5-10 9" />
            </svg>
            {(modifiedFiles.size > 0 || pendingDeletions.size > 0) && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 text-[9px] text-black font-bold rounded-full flex items-center justify-center">
                {modifiedFiles.size + pendingDeletions.size}
              </span>
            )}
          </button>
          <button
            onClick={() => setSideTab('npm')}
            className={`p-2 rounded transition-colors ${
              sideTab === 'npm' ? 'text-white bg-white/10' : 'text-gray-500 hover:text-gray-300'
            }`}
            title="NPM Packages"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0h-2.666V8.667h2.666v5.331zm12 0h-1.332v-4h-1.335v4h-1.332v-4h-1.335v4h-2.663V8.667h8v5.331zM10 10v2.668h1.334V10H10z" />
            </svg>
          </button>
        </div>

        {/* ─── Sidebar panel ─── */}
        <div className="w-60 flex-shrink-0 bg-[#252526] border-r border-[#3c3c3c] flex flex-col overflow-hidden">
          {sideTab === 'files' && (
            <>
              <div className="px-3 py-2 flex items-center justify-between border-b border-[#3c3c3c]">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  {t('fileExplorer')}
                </span>
                <button
                  onClick={() => {
                    setNewFileDialog({ parentDir: '' });
                    setNewFileName('');
                  }}
                  className="text-gray-500 hover:text-gray-300 transition-colors p-0.5"
                  title="New File"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              {/* Inline new-file input */}
              {newFileDialog && (
                <div className="px-2 py-1.5 border-b border-[#3c3c3c] bg-[#2d2d2d]">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFile(newFileDialog.parentDir, newFileName);
                      if (e.key === 'Escape') setNewFileDialog(null);
                    }}
                    placeholder="path/to/file.tsx"
                    autoFocus
                    className="w-full px-2 py-1 text-xs bg-[#3c3c3c] border border-emerald-500 rounded text-gray-300 placeholder-gray-500 focus:outline-none"
                  />
                  <div className="flex justify-end gap-1 mt-1">
                    <button
                      onClick={() => setNewFileDialog(null)}
                      className="text-[10px] text-gray-500 hover:text-gray-300 px-1.5 py-0.5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleCreateFile(newFileDialog.parentDir, newFileName)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 px-1.5 py-0.5"
                    >
                      Create
                    </button>
                  </div>
                </div>
              )}
              <div className="px-2 py-1.5 border-b border-[#3c3c3c]">
                <input
                  type="text"
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  placeholder={t('searchFiles')}
                  className="w-full px-2 py-1 text-xs bg-[#3c3c3c] border border-[#4c4c4c] rounded text-gray-300 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex-1 overflow-y-auto py-1 px-1">
                {repoFiles.length === 0 ? (
                  <p className="text-xs text-gray-500 px-2 py-4">{t('noFilesInRepo')}</p>
                ) : (
                  renderTree(filteredTree(tree))
                )}
              </div>
            </>
          )}

          {sideTab === 'git' && (
            <>
              <div className="px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-[#3c3c3c]">
                {t('gitActions')}
              </div>
              <div className="flex-1 overflow-y-auto">
                {/* Modified files */}
                <div className="px-3 py-2">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase mb-1">
                    {t('modifiedFiles')} ({modifiedFiles.size + pendingDeletions.size})
                  </div>
                  {modifiedFiles.size === 0 && pendingDeletions.size === 0 ? (
                    <p className="text-xs text-gray-500 py-2">{t('noChanges')}</p>
                  ) : (
                    <div className="space-y-0.5">
                      {Array.from(modifiedFiles.keys()).map((path) => (
                        <button
                          key={path}
                          onClick={() => loadFileContent(path)}
                          className={`w-full text-left text-xs hover:bg-white/5 rounded px-2 py-1 truncate ${
                            newFiles.has(path) ? 'text-green-400' : 'text-amber-400'
                          }`}
                        >
                          {newFiles.has(path) ? 'A' : 'M'} {path}
                        </button>
                      ))}
                      {Array.from(pendingDeletions).map((path) => (
                        <div
                          key={`del-${path}`}
                          className="w-full flex items-center text-left text-xs text-red-400 rounded px-2 py-1"
                        >
                          <span className="truncate flex-1">D {path}</span>
                          <button
                            onClick={() => setPendingDeletions((prev) => {
                              const next = new Set(prev);
                              next.delete(path);
                              return next;
                            })}
                            className="text-gray-500 hover:text-gray-300 ml-1 flex-shrink-0"
                            title="Undo delete"
                          >
                            ↩
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Commit form */}
                <div className="px-3 py-2 border-t border-[#3c3c3c]">
                  <textarea
                    value={commitMsg}
                    onChange={(e) => setCommitMsg(e.target.value)}
                    placeholder={t('commitMessagePlaceholder')}
                    rows={3}
                    className="w-full px-2 py-1.5 text-xs bg-[#3c3c3c] border border-[#4c4c4c] rounded text-gray-300 placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                  <button
                    onClick={handleCommit}
                    disabled={committing || (modifiedFiles.size === 0 && pendingDeletions.size === 0) || !commitMsg.trim()}
                    className="w-full mt-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded transition-colors"
                  >
                    {committing ? t('committing') : t('commitAndPush')}
                  </button>
                  {commitResult && (
                    <p
                      className={`mt-1.5 text-[10px] ${
                        commitResult.ok ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {commitResult.msg}
                    </p>
                  )}
                </div>

                {/* Commit history */}
                <div className="px-3 py-2 border-t border-[#3c3c3c]">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase mb-1">
                    {t('commitHistory')}
                  </div>
                  {commits.length === 0 ? (
                    <p className="text-xs text-gray-500 py-2">{t('noCommits')}</p>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {commits.map((c) => (
                        <div
                          key={c.sha}
                          className="text-[11px] px-2 py-1.5 bg-[#2d2d2d] rounded border border-[#3c3c3c]"
                        >
                          <div className="text-gray-300 truncate">{c.message}</div>
                          <div className="flex items-center justify-between mt-0.5 text-gray-500">
                            <span>{c.author}</span>
                            <span>{c.sha.slice(0, 7)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {sideTab === 'npm' && (
            <>
              <div className="px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-[#3c3c3c]">
                NPM Packages
              </div>
              <div className="px-2 py-1.5 border-b border-[#3c3c3c]">
                <input
                  type="text"
                  value={npmQuery}
                  onChange={(e) => setNpmQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') searchNpm(npmQuery);
                  }}
                  placeholder="Search packages..."
                  className="w-full px-2 py-1 text-xs bg-[#3c3c3c] border border-[#4c4c4c] rounded text-gray-300 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {npmSearching && (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent" />
                  </div>
                )}
                {!npmSearching && npmResults.length === 0 && npmQuery && (
                  <p className="text-xs text-gray-500 px-3 py-4">No results</p>
                )}
                {npmResults.map((pkg) => {
                  const isInstalled = installedPkgs.includes(pkg.name);
                  return (
                    <div
                      key={pkg.name}
                      className="px-3 py-2 border-b border-[#3c3c3c] hover:bg-white/5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-200 font-medium truncate">{pkg.name}</span>
                        <span className="text-[10px] text-gray-500 flex-shrink-0 ml-1">{pkg.version}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{pkg.description}</p>
                      <button
                        onClick={() => installNpmPackage(pkg.name, pkg.version)}
                        disabled={isInstalled}
                        className={`mt-1 text-[10px] px-2 py-0.5 rounded ${
                          isInstalled
                            ? 'bg-gray-500/20 text-gray-500 cursor-default'
                            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                        }`}
                      >
                        {isInstalled ? 'Added' : 'Install'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ─── Editor area ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          {openTabs.length > 0 && (
            <div className="flex items-center bg-[#252526] border-b border-[#3c3c3c] overflow-x-auto flex-shrink-0">
              {openTabs.map((tab) => {
                const isActive_ = tab === activeFile;
                const isModified_ = modifiedFiles.has(tab);
                return (
                  <div
                    key={tab}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-[#3c3c3c] ${
                      isActive_
                        ? 'bg-[#1e1e1e] text-white border-t-2 border-t-emerald-500'
                        : 'text-gray-400 hover:bg-[#2d2d2d]'
                    }`}
                    onClick={() => loadFileContent(tab)}
                  >
                    <FileIcon path={tab} />
                    <span className="truncate max-w-[120px]">{tab.split('/').pop()}</span>
                    {isModified_ && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab);
                      }}
                      className="ml-1 text-gray-500 hover:text-white p-0.5"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Monaco or welcome */}
          <div className="flex-1 overflow-hidden flex" style={{ position: 'relative', minWidth: 0 }}>
            <div className="flex-1" style={{ overflow: 'visible', position: 'relative', minWidth: 0 }}>
              {loadingFile ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
                </div>
              ) : activeFile ? (
                <MonacoEditor
                  key={activeFile}
                  height="100%"
                  language={languageForFile(activeFile)}
                  path={activeFile}
                  theme="vs-dark"
                  value={fileContent}
                  onChange={handleEditorChange}
                  beforeMount={handleEditorWillMount}
                  onMount={handleEditorDidMount}
                  options={{
                    minimap: { enabled: true },
                    fontSize: 13,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    insertSpaces: true,
                    renderWhitespace: 'selection',
                    bracketPairColorization: { enabled: true },
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    padding: { top: 8 },
                    fixedOverflowWidgets: true,
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center space-y-2">
                    <svg className="w-12 h-12 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <p className="text-sm">{t('previewHint')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Preview panel (resizable) ─── */}
            {previewOpen && (
              <>
                {/* drag handle */}
                <div
                  className="w-1 cursor-col-resize bg-[#3c3c3c] hover:bg-emerald-500 transition-colors flex-shrink-0"
                  onMouseDown={() => {
                    resizing.current = true;
                    document.body.style.cursor = 'col-resize';
                    document.body.style.userSelect = 'none';
                    // Disable iframe pointer events so mousemove isn't swallowed
                    if (previewIframeRef.current) {
                      previewIframeRef.current.style.pointerEvents = 'none';
                    }
                  }}
                />
                <div
                  className="flex flex-col overflow-hidden flex-shrink-0"
                  style={{ width: previewWidth }}
                >
                  <div className="h-8 flex items-center justify-between px-3 bg-[#252526] border-b border-[#3c3c3c] flex-shrink-0">
                    <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                      {t('preview')}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {['home', 'products', 'about'].map((p) => (
                        <button
                          key={p}
                          onClick={() => setPreviewPage(p)}
                          className={`px-1.5 py-0.5 text-[10px] rounded capitalize ${
                            previewPage === p
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 bg-white overflow-hidden">
                    <iframe
                      ref={previewIframeRef}
                      srcDoc={previewSrcdoc || undefined}
                      sandbox="allow-scripts"
                      className="w-full h-full border-0"
                      title={t('preview')}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Status bar ─── */}
      <div className="h-6 flex items-center justify-between px-3 bg-[#007acc] text-white text-[11px] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span>main</span>
          {modifiedFiles.size > 0 && <span>● {modifiedFiles.size} modified</span>}
          {pendingDeletions.size > 0 && <span>● {pendingDeletions.size} deleted</span>}
        </div>
        <div className="flex items-center gap-3">
          {activeFile && <span>{languageForFile(activeFile)}</span>}
          <span>UTF-8</span>
        </div>
      </div>

      {/* ─── Context menu (Phase C) ─── */}
      {contextMenu && (
        <>
          {/* Backdrop to close the menu */}
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div
            className="fixed z-[101] bg-[#252526] border border-[#3c3c3c] rounded shadow-xl py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.isDir && (
              <button
                onClick={() => {
                  setNewFileDialog({ parentDir: contextMenu.path });
                  setNewFileName('');
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10"
              >
                New File in Folder
              </button>
            )}
            {!contextMenu.isDir && (
              <>
                <button
                  onClick={() => {
                    const name = contextMenu.path.split('/').pop() || '';
                    setRenameDialog({ oldPath: contextMenu.path });
                    setRenameValue(name);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10"
                >
                  Rename
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirm(contextMenu.path);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-white/10"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* ─── Rename dialog (Phase C) ─── */}
      {renameDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg p-4 w-80">
            <h3 className="text-sm font-medium text-gray-200 mb-2">Rename File</h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameFile(renameDialog.oldPath, renameValue);
                if (e.key === 'Escape') setRenameDialog(null);
              }}
              autoFocus
              className="w-full px-2 py-1.5 text-xs bg-[#3c3c3c] border border-[#4c4c4c] rounded text-gray-300 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setRenameDialog(null)}
                className="px-3 py-1 text-xs text-gray-400 hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRenameFile(renameDialog.oldPath, renameValue)}
                className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete confirmation (Phase C) ─── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg p-4 w-80">
            <h3 className="text-sm font-medium text-gray-200 mb-2">Delete File</h3>
            <p className="text-xs text-gray-400 mb-3">
              Are you sure you want to delete <span className="text-gray-200">{deleteConfirm}</span>?
              This will be committed on next push.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1 text-xs text-gray-400 hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteFile(deleteConfirm)}
                className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
