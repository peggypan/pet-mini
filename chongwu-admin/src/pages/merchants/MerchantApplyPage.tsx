import { Button, Descriptions, Drawer, Space, Table, message } from 'antd';
import { useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { AuditStatusTag } from '../../components/AuditStatusTag';
import { StatusFilterBar, filterByAuditStatus, type StatusFilterValue } from '../../components/StatusFilterBar';
import { ListToolbar } from '../../components/ListToolbar';
import { useSyncMenuPendingBadge } from '../../context/PendingBadgeContext';
import { countPendingStatus } from '../../utils/audit-pending';

const MENU_PATH = '/merchants/applies';
import { mockMerchantApplies } from '../../mock/data';
import { LabeledImageGrid } from '../../components/DetailMediaGallery';
import type { MerchantApplyRow } from '../../types';

function merchantCredentialItems(row: MerchantApplyRow) {
  return [
    { label: '营业执照', url: row.licenseImage },
    { label: '法人身份证（正面）', url: row.idFrontImage },
    { label: '法人身份证（反面）', url: row.idBackImage },
    { label: '门店门头', url: row.shopFrontImage },
  ];
}

export function MerchantApplyPage() {
  const [rows, setRows] = useState(mockMerchantApplies);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<MerchantApplyRow | null>(null);

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
          r.shopName.toLowerCase().includes(q)
          || r.contact.toLowerCase().includes(q)
          || r.city.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, statusFilter, keyword]);

  const patchStatus = (id: string, status: MerchantApplyRow['status']) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (detail?.id === id) setDetail((d) => (d ? { ...d, status } : d));
    message.success(status === 'approved' ? '已通过入驻申请' : '已拒绝');
  };

  const pendingCount = useMemo(() => countPendingStatus(rows, (r) => r.status), [rows]);
  useSyncMenuPendingBadge(MENU_PATH, pendingCount);

  const bulkApproveAll = () => {
    if (!pendingCount) return;
    setRows((prev) =>
      prev.map((r) => (r.status === 'pending' ? { ...r, status: 'approved' as const } : r)),
    );
    setDetail((d) => (d?.status === 'pending' ? { ...d, status: 'approved' } : d));
    message.success(`已通过 ${pendingCount} 个入驻申请`);
  };

  return (
    <>
      <PageIntro
        title="商家入驻审核"
        description="对应 event-qualify 商家资质 · store.submitMerchantApply：营业执照、法人证件、门头照等。"
      />
      <StatusFilterBar value={statusFilter} onChange={setStatusFilter} counts={statusCounts} />
      <ListToolbar
        searchPlaceholder="店铺 / 联系人 / 城市"
        onSearch={setKeyword}
        bulkApprove={{ pendingCount, onConfirm: bulkApproveAll, unit: '个申请' }}
      />
      <Table
        rowKey="id"
        dataSource={displayRows}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 960 }}
        columns={[
          { title: '店铺', dataIndex: 'shopName', ellipsis: true },
          { title: '联系人', dataIndex: 'contact', width: 100 },
          { title: '电话', dataIndex: 'phone', width: 120 },
          { title: '城市', dataIndex: 'city', width: 88 },
          { title: '状态', dataIndex: 'status', width: 96, render: (s) => <AuditStatusTag status={s} /> },
          { title: '提交时间', dataIndex: 'submittedAt', width: 168 },
          {
            title: '操作',
            width: 260,
            fixed: 'right',
            render: (_, r) => (
              <Space wrap size={0}>
                <Button type="link" size="small" onClick={() => setDetail(r)}>
                  查看资料
                </Button>
                {r.status === 'pending' && (
                  <>
                    <Button type="primary" size="small" onClick={() => patchStatus(r.id, 'approved')}>
                      通过
                    </Button>
                    <Button size="small" danger onClick={() => patchStatus(r.id, 'rejected')}>
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
        title={detail ? `入驻资料 · ${detail.shopName}` : '入驻资料'}
        width={520}
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
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 20 }}>
              <Descriptions.Item label="店铺名称">{detail.shopName}</Descriptions.Item>
              <Descriptions.Item label="企业名称">{detail.companyName || '—'}</Descriptions.Item>
              <Descriptions.Item label="统一社会信用代码">{detail.licenseNo || '—'}</Descriptions.Item>
              <Descriptions.Item label="法定代表人">{detail.legalPerson || '—'}</Descriptions.Item>
              <Descriptions.Item label="联系人">{detail.contact}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{detail.contactPhone || detail.phone}</Descriptions.Item>
              <Descriptions.Item label="城市">{detail.city}</Descriptions.Item>
              <Descriptions.Item label="经营地址">{detail.address || '—'}</Descriptions.Item>
              <Descriptions.Item label="简介">{detail.intro || '—'}</Descriptions.Item>
              <Descriptions.Item label="审核状态">
                <AuditStatusTag status={detail.status} />
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">{detail.submittedAt}</Descriptions.Item>
            </Descriptions>
            <p className="pet-cert-section-title">资质照片</p>
            <LabeledImageGrid items={merchantCredentialItems(detail)} />
          </>
        ) : null}
      </Drawer>
    </>
  );
}
