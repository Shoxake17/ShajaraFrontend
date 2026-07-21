// features/admin/pages/AdminUserTreePage.tsx
// Admin panel — bitta foydalanuvchining TO'LIQ Shajara doskasini FAQAT
// KO'RISH rejimida ko'rsatadi (surish/tahrirlash/o'chirish/qo'shish YO'Q) —
// mavjud buildBoard/PersonNode/TreeEdge render tizimini qayta ishlatadi.
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Background, BackgroundVariant, Controls, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { AppLayoutContext } from '@/app/AppLayout';
import { adminApi, type AdminUserBoard } from '@/features/admin/api/admin.api';
import { buildBoard, type PersonNodeType } from '@/features/tree/model/build-board';
import { PersonNode } from '@/features/tree/components/PersonNode';
import { TreeEdge } from '@/features/tree/components/TreeEdge';
import { ProfilePanel } from '@/features/tree/components/ProfilePanel';

const nodeTypes = { person: PersonNode };
const edgeTypes = { tree: TreeEdge };

// Admin hech qachon tahrirlay olmaydi — ProfilePanel'ning o'z ichki
// huquq hisoblashi (createdById === uid) admin'ning soxta uid'iga hech
// qachon mos kelmasligi tufayli tahrirlash/o'chirish tugmalari
// KO'RSATILMAYDI (onEdit/onDelete shu bois HECH QACHON chaqirilmaydi).
const READ_ONLY_ACCESS = {
  role: 'VIEWER' as const,
  anchorMemberId: null,
  treeOwnerId: '__admin-readonly__',
  userId: '__admin-readonly__',
};

export function AdminUserTreePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { topBarActionsEl } = useOutletContext<AppLayoutContext>();
  const [board, setBoard] = useState<AdminUserBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    adminApi
      .getUserBoard(userId)
      .then(setBoard)
      .catch(() => setError(t('admin.loadFailed')))
      .finally(() => setLoading(false));
  }, [userId, t]);

  const { nodes, edges } = useMemo(() => {
    if (!board) return { nodes: [] as PersonNodeType[], edges: [] };
    return buildBoard(board.members, board.edges);
  }, [board]);

  const profileNode = useMemo(() => {
    const node = nodes.find((n) => n.id === profileId);
    return node ? { ...node.data, id: node.id } : null;
  }, [nodes, profileId]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-brand-50">
      {topBarActionsEl &&
        createPortal(
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="shrink-0 rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-100"
            >
              ← {t('common.back')}
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-brand-900">
                {board ? board.owner.fullName : t('admin.title')}
              </p>
              {board && (
                <p className="hidden truncate text-xs text-brand-500 sm:block">
                  {board.owner.email ?? board.owner.phone ?? ''}
                </p>
              )}
            </div>
          </div>,
          topBarActionsEl,
        )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
        </div>
      ) : error ? (
        <p className="flex flex-1 items-center justify-center text-sm text-red-500">{error}</p>
      ) : (
        <div className="relative flex-1">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
              onNodeClick={(_, node: PersonNodeType) => setProfileId(node.id)}
              fitView
              fitViewOptions={{ padding: 0.15, maxZoom: 1.2 }}
              minZoom={0.05}
              maxZoom={4}
              deleteKeyCode={null}
              defaultEdgeOptions={{ type: 'smoothstep' }}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="#C8D6C4" />
              <Controls showInteractive={false} />
            </ReactFlow>

            <ProfilePanel
              node={profileNode}
              access={READ_ONLY_ACCESS}
              onClose={() => setProfileId(null)}
              onEdit={() => undefined}
              onDelete={() => undefined}
              onAddRelative={() => undefined}
            />
          </ReactFlowProvider>
        </div>
      )}
    </div>
  );
}
