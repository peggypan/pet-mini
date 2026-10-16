import { Button, Descriptions, Drawer, Space, Table, Tag, message } from 'antd';
import { useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { VerifyStatusTag } from '../../components/VerifyStatusTag';
import { ListToolbar } from '../../components/ListToolbar';
import { useSyncMenuPendingBadge } from '../../context/PendingBadgeContext';
import { countPendingStatus } from '../../utils/audit-pending';

const MENU_PATH = '/host/event-qualify';
import { LabeledImageGrid, type LabeledImageItem } from '../../components/DetailMediaGallery';
import { useCloudList } from '../../hooks/useCloudList';
import { fetchEventQualify } from '../../services/admin-data';
import { reviewEventQualify } from '../../services/moderation';
import type { EventQualifyRow, VerifyStatus } from '../../types';

function qualifyCredentialItems(row: EventQualifyRow): LabeledImageItem[] {
  if (row.role === 'merchant') {
    return [
      { label: '营业执照', url: row.licenseImage },
      { label: '法人身份证（人像面）', url: row.idFrontImage },
      { label: '法人身份证（国徽面）', url: row.idBackImage },
      { label: '门店门头', url: row.shopFrontImage },
    ];
  }
  return [
    { label: '身份证（人像面）', url: row.idFrontImage },
    { label: '身份证（国徽面）', url: row.idBackImage },
  ];
}

export function EventQualifyManagePage() {
  const { rows, loading, reload } = useCloudList(() => fetchEventQualify(), []);
  const [keyword, setKeyword] = useState('');
  const [verifyFilter, setVerifyFilter] = useState<VerifyStatus | 'all'>('pending');
  const [detail, setDetail] = useState<EventQualifyRow | null>(null);

  const displayRows = useMemo(() => {
    let list = rows;
    if (verifyFilter !== 'all') list = list.filter((r) => r.verifyStatus === verifyFilter);
    const q = keyword.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) => r.userName.toLowerCase().includes(q) || (r.realName || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, verifyFilter, keyword]);

  const approveVerify = async (id: string) => {
    try {
      await reviewEventQualify(id, 'approve');
      message.success('身份/资质已通过');
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  const rejectVerify = async (id: string) => {
    try {
      await reviewEventQualify(id, 'reject', '资质未通过');
      message.warning('已驳回');
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  const pendingCount = useMemo(
    () => countPendingStatus(rows, (r) => r.verifyStatus),
    [rows],
  );
  useSyncMenuPendingBadge(MENU_PATH, pendingCount);

  const bulkApproveAll = async () => {
    if (!pendingCount) return;
    const pending = rows.filter((r) => r.verifyStatus === 'pending');
    try {
      await Promise.all(pending.map((r) => reviewEventQualify(r.id, 'approve')));
      message.success(`已通过 ${pending.length} 条活动发布资质`);
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '批量通过失败');
    }
  };

  return (
    <>
      <PageIntro
        title="活动发布资质"
        description="对应 event-qualify：个人/商家身份认证通过后即可发布活动（无需保证金）。"
      />
      <ListToolbar
        searchPlaceholder="用户 / 姓名"
        onSearch={setKeyword}
        bulkApprove={{ pendingCount, onConfirm: bulkApproveAll, unit: '条资质' }}
        extra={
          <Space>
            {(['all', 'pending', 'approved', 'rejected'] as const).map((k) => (
              <Button
                key={k}
                size="small"
                type={verifyFilter === k ? 'primary' : 'default'}
                onClick={() => setVerifyFilter(k)}
              >
                {k === 'all' ? '全部' : k === 'pending' ? '待审' : k === 'approved' ? '已通过' : '未通过'}
              </Button>
            ))}
          </Space>
        }
      />
      <Table
        rowKey="id"
        loading={loading}
        dataSource={displayRows}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 1100 }}
        columns={[
          { title: '用户', dataIndex: 'userName', width: 120 },
          {
            title: '发布类型',
            dataIndex: 'role',
            width: 100,
            render: (r: string) => (r === 'merchant' ? <Tag color="purple">商家发布</Tag> : <Tag>个人发布</Tag>),
          },
          { title: '实名', dataIndex: 'realName', width: 80 },
          { title: '身份证', dataIndex: 'idCardMasked', width: 160, render: (v) => v || '—' },
          { title: '手机', dataIndex: 'phone', width: 120, render: (v) => v || '—' },
          {
            title: '认证',
            dataIndex: 'verifyStatus',
            width: 96,
            render: (s) => <VerifyStatusTag status={s} />,
          },
          {
            title: '可发活动',
            dataIndex: 'canPublish',
            width: 96,
            render: (v) => (v ? <Tag color="blue">是</Tag> : <Tag>否</Tag>),
          },
          { title: '提交时间', dataIndex: 'submittedAt', width: 160 },
          {
            title: '操作',
            width: 220,
            fixed: 'right',
            render: (_, r) => (
              <Space wrap size={0}>
                <Button type="link" size="small" onClick={() => setDetail(r)}>
                  查看资料
                </Button>
                {r.verifyStatus === 'pending' && (
                  <>
                    <Button type="link" size="small" onClick={() => approveVerify(r.id)}>
                      通过认证
                    </Button>
                    <Button type="link" size="small" danger onClick={() => rejectVerify(r.id)}>
                      驳回
                    </Button>
                  </>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Drawer
        title="活动发布资质资料"
        width={560}
        open={!!detail}
        onClose={() => setDetail(null)}
        extra={
          detail?.verifyStatus === 'pending' ? (
            <Space>
              <Button type="primary" onClick={() => approveVerify(detail.id)}>
                通过认证
              </Button>
              <Button danger onClick={() => rejectVerify(detail.id)}>
                驳回
              </Button>
            </Space>
          ) : null
        }
      >
        {detail ? (
          <>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="用户">{detail.userName}</Descriptions.Item>
            <Descriptions.Item label="用户 ID">{detail.userId}</Descriptions.Item>
            <Descriptions.Item label="发布类型">
              {detail.role === 'merchant' ? '商家发布' : '个人发布'}
            </Descriptions.Item>
            <Descriptions.Item label="实名">{detail.realName || '—'}</Descriptions.Item>
            <Descriptions.Item label="身份证">{detail.idCardMasked || '—'}</Descriptions.Item>
            <Descriptions.Item label="手机">{detail.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="认证">
              <VerifyStatusTag status={detail.verifyStatus} />
            </Descriptions.Item>
            <Descriptions.Item label="可发活动">{detail.canPublish ? '是' : '否'}</Descriptions.Item>
            {detail.role === 'merchant' && detail.companyName ? (
              <Descriptions.Item label="企业名称">{detail.companyName}</Descriptions.Item>
            ) : null}
            {detail.licenseNo ? (
              <Descriptions.Item label="信用代码">{detail.licenseNo}</Descriptions.Item>
            ) : null}
            <Descriptions.Item label="提交时间">{detail.submittedAt}</Descriptions.Item>
          </Descriptions>
          <p className="pet-cert-section-title">资质照片</p>
          <LabeledImageGrid items={qualifyCredentialItems(detail)} />
          </>
        ) : null}
      </Drawer>
    </>
  );
}
