import { Button, Descriptions, Drawer, Space, Table, message } from 'antd';
import { useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { AuditStatusTag } from '../../components/AuditStatusTag';
import { StatusFilterBar, filterByAuditStatus, type StatusFilterValue } from '../../components/StatusFilterBar';
import { ListToolbar } from '../../components/ListToolbar';
import { useSyncMenuPendingBadge } from '../../context/PendingBadgeContext';
import { countPendingStatus } from '../../utils/audit-pending';

const MENU_PATH = '/community/comments';
import { mockComments, mockSocialPosts } from '../../mock/data';
import type { CommentRow } from '../../types';

function postTitle(postId: string) {
  const p = mockSocialPosts.find((x) => x.id === postId);
  if (!p) return '—';
  return (p.content || p.topic || postId).slice(0, 48);
}

export function CommentListPage() {
  const [rows, setRows] = useState(mockComments);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<CommentRow | null>(null);

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<StatusFilterValue, number>> = { all: rows.length };
    rows.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [rows]);

  const displayRows = useMemo(() => {
    let list = filterByAuditStatus(rows, statusFilter);
    const q = keyword.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.content.toLowerCase().includes(q)
          || r.userName.toLowerCase().includes(q)
          || r.postId.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, statusFilter, keyword]);

  const setStatus = (id: string, status: CommentRow['status']) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (detail?.id === id) setDetail((d) => (d ? { ...d, status } : d));
    message.success('已更新（Mock）');
  };

  const pendingCount = useMemo(() => countPendingStatus(rows, (r) => r.status), [rows]);
  useSyncMenuPendingBadge(MENU_PATH, pendingCount);

  const bulkApproveAll = () => {
    if (!pendingCount) return;
    setRows((prev) =>
      prev.map((r) => (r.status === 'pending' ? { ...r, status: 'approved' as const } : r)),
    );
    setDetail((d) => (d?.status === 'pending' ? { ...d, status: 'approved' } : d));
    message.success(`已通过 ${pendingCount} 条评论`);
  };

  return (
    <>
      <PageIntro
        title="评论管理"
        description="对应 social-detail 一级评论与楼中楼回复（parentId / replyToUserName）。"
      />
      <StatusFilterBar value={statusFilter} onChange={setStatusFilter} counts={statusCounts} />
      <ListToolbar
        searchPlaceholder="用户 / 内容 / 帖子 ID"
        onSearch={setKeyword}
        bulkApprove={{ pendingCount, onConfirm: bulkApproveAll, unit: '条评论' }}
      />
      <Table
        rowKey="id"
        dataSource={displayRows}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 960 }}
        columns={[
          { title: '帖子 ID', dataIndex: 'postId', width: 100 },
          {
            title: '类型',
            width: 100,
            render: (_, r) => (r.parentId ? <span className="text-reply">楼中楼回复</span> : '一级评论'),
          },
          { title: '用户', dataIndex: 'userName', width: 110 },
          {
            title: '内容',
            ellipsis: true,
            render: (_, r) =>
              r.replyToUserName ? (
                <span>
                  <span className="text-reply-at">回复 {r.replyToUserName}：</span>
                  {r.content}
                </span>
              ) : (
                r.content
              ),
          },
          { title: '状态', dataIndex: 'status', width: 100, render: (s) => <AuditStatusTag status={s} /> },
          { title: '时间', dataIndex: 'createdAt', width: 160 },
          {
            title: '操作',
            width: 240,
            fixed: 'right',
            render: (_, r) => (
              <Space wrap size={0}>
                <Button type="link" size="small" onClick={() => setDetail(r)}>
                  查看资料
                </Button>
                {r.status === 'pending' && (
                  <>
                    <Button type="link" size="small" onClick={() => setStatus(r.id, 'approved')}>
                      通过
                    </Button>
                    <Button type="link" size="small" danger onClick={() => setStatus(r.id, 'rejected')}>
                      拒绝
                    </Button>
                  </>
                )}
                <Button type="link" size="small" onClick={() => setStatus(r.id, 'hidden')}>
                  隐藏
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Drawer
        title="评论资料"
        width={480}
        open={!!detail}
        onClose={() => setDetail(null)}
        extra={
          detail?.status === 'pending' ? (
            <Space>
              <Button type="primary" size="small" onClick={() => setStatus(detail.id, 'approved')}>
                通过
              </Button>
              <Button danger size="small" onClick={() => setStatus(detail.id, 'rejected')}>
                拒绝
              </Button>
            </Space>
          ) : null
        }
      >
        {detail ? (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="评论 ID">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="所属帖子">{detail.postId}</Descriptions.Item>
            <Descriptions.Item label="帖子摘要">{postTitle(detail.postId)}</Descriptions.Item>
            <Descriptions.Item label="评论类型">
              {detail.parentId ? `楼中楼 · 父评论 ${detail.parentId}` : '一级评论'}
            </Descriptions.Item>
            {detail.replyToUserName ? (
              <Descriptions.Item label="回复对象">{detail.replyToUserName}</Descriptions.Item>
            ) : null}
            <Descriptions.Item label="用户">{detail.userName}</Descriptions.Item>
            <Descriptions.Item label="正文">{detail.content}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <AuditStatusTag status={detail.status} />
            </Descriptions.Item>
            <Descriptions.Item label="时间">{detail.createdAt}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>
    </>
  );
}
