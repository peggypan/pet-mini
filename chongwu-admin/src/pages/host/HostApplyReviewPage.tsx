import { Button, Descriptions, Drawer, Space, Table, message } from 'antd';
import { useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { AuditStatusTag } from '../../components/AuditStatusTag';
import { StatusFilterBar, filterByAuditStatus, type StatusFilterValue } from '../../components/StatusFilterBar';
import { ListToolbar } from '../../components/ListToolbar';
import { useSyncMenuPendingBadge } from '../../context/PendingBadgeContext';
import { countPendingStatus } from '../../utils/audit-pending';

const MENU_PATH = '/host/applies';
import { DetailMediaSection } from '../../components/DetailMediaGallery';
import { mockHostApplies } from '../../mock/data';
import type { HostApplyRow } from '../../types';

export function HostApplyReviewPage() {
  const [rows, setRows] = useState(mockHostApplies);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('pending');
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<HostApplyRow | null>(null);

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
          r.clubName.toLowerCase().includes(q)
          || r.applicantNickname.toLowerCase().includes(q)
          || r.city.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, statusFilter, keyword]);

  const patchStatus = (id: string, status: HostApplyRow['status']) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (detail?.id === id) setDetail((d) => (d ? { ...d, status } : d));
    message.success(status === 'approved' ? '已通过，可在「俱乐部管理」上线' : '已更新（Mock）');
  };

  const pendingCount = useMemo(() => countPendingStatus(rows, (r) => r.status), [rows]);
  useSyncMenuPendingBadge(MENU_PATH, pendingCount);

  const bulkApproveAll = () => {
    if (!pendingCount) return;
    setRows((prev) =>
      prev.map((r) => (r.status === 'pending' ? { ...r, status: 'approved' as const } : r)),
    );
    setDetail((d) => (d?.status === 'pending' ? { ...d, status: 'approved' } : d));
    message.success(`已通过 ${pendingCount} 个主理人申请`);
  };

  return (
    <>
      <PageIntro
        title="成为主理人 · 入驻审核"
        description="对应小程序 profile「成为主理人」→ club-apply：俱乐部名称、城市、介绍、封面与联系方式。"
      />
      <StatusFilterBar value={statusFilter} onChange={setStatusFilter} counts={statusCounts} />
      <ListToolbar
        searchPlaceholder="俱乐部 / 申请人 / 城市"
        onSearch={setKeyword}
        bulkApprove={{ pendingCount, onConfirm: bulkApproveAll, unit: '个申请' }}
      />
      <Table
        rowKey="id"
        dataSource={displayRows}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        columns={[
          { title: '俱乐部', dataIndex: 'clubName' },
          { title: '申请人', dataIndex: 'applicantNickname', width: 120 },
          { title: '城市', dataIndex: 'city', width: 88 },
          { title: '状态', dataIndex: 'status', width: 96, render: (s) => <AuditStatusTag status={s} /> },
          { title: '提交时间', dataIndex: 'submittedAt', width: 168 },
          {
            title: '操作',
            width: 220,
            render: (_, r) => (
              <Space>
                <Button type="link" size="small" onClick={() => setDetail(r)}>
                  查看资料
                </Button>
                {r.status === 'pending' && (
                  <>
                    <Button type="link" size="small" onClick={() => patchStatus(r.id, 'approved')}>
                      通过
                    </Button>
                    <Button type="link" size="small" danger onClick={() => patchStatus(r.id, 'rejected')}>
                      拒绝
                    </Button>
                  </>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Drawer
        title={detail ? `${detail.clubName} · 入驻资料` : '入驻资料'}
        width={480}
        open={!!detail}
        onClose={() => setDetail(null)}
        extra={
          detail?.status === 'pending' ? (
            <Space>
              <Button type="primary" onClick={() => patchStatus(detail.id, 'approved')}>
                通过
              </Button>
              <Button danger onClick={() => patchStatus(detail.id, 'rejected')}>
                拒绝
              </Button>
            </Space>
          ) : null
        }
      >
        {detail ? (
          <>
            <DetailMediaSection title="俱乐部封面" urls={[detail.cover]} size={160} />
            <Descriptions column={1} size="small" bordered style={{ marginTop: 8 }}>
              <Descriptions.Item label="申请人">{detail.applicantNickname}</Descriptions.Item>
              <Descriptions.Item label="城市">{detail.city}</Descriptions.Item>
              <Descriptions.Item label="联系方式">{detail.contact || '—'}</Descriptions.Item>
              <Descriptions.Item label="介绍">{detail.intro}</Descriptions.Item>
              <Descriptions.Item label="审核">
                <AuditStatusTag status={detail.status} />
              </Descriptions.Item>
            </Descriptions>
          </>
        ) : null}
      </Drawer>
    </>
  );
}
