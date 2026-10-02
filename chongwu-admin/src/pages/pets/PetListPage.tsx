import { Button, Descriptions, Drawer, Image, Input, Modal, Space, Table, Tag, Typography, message } from 'antd';
import { useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { AuditStatusTag } from '../../components/AuditStatusTag';
import { StatusFilterBar, filterByAuditField, type StatusFilterValue } from '../../components/StatusFilterBar';
import { ListToolbar } from '../../components/ListToolbar';
import { useSyncMenuPendingBadge } from '../../context/PendingBadgeContext';
import { countPendingStatus } from '../../utils/audit-pending';

const MENU_PATH = '/pets';
import { DetailMediaSection } from '../../components/DetailMediaGallery';
import { mockPets } from '../../mock/data';
import type { AuditStatus, PetRow, PetVaccineStatus } from '../../types';

const VACCINE_LABEL: Record<string, string> = {
  immune: '已免疫',
  vaccinating: '免疫中',
  none: '未免疫',
};

function vaccineLabel(status?: string) {
  if (!status) return '—';
  return VACCINE_LABEL[status] || status;
}

function PhoneCell({ phone, emptyLabel = '未填写' }: { phone?: string; emptyLabel?: string }) {
  const v = (phone || '').trim();
  if (!v) return <Tag>{emptyLabel}</Tag>;
  return <Typography.Text copyable={{ text: v }}>{v}</Typography.Text>;
}

function PetPhotoThumb({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return <Tag>无</Tag>;
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={52}
      height={52}
      style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #e8f4ff' }}
      preview={{ mask: '查看' }}
    />
  );
}

function PetGalleryCell({ photos }: { photos?: string[] }) {
  const list = photos || [];
  if (!list.length) return <Tag>未上传</Tag>;
  return (
    <Image.PreviewGroup>
      <Space size={6} wrap>
        {list.slice(0, 4).map((url) => (
          <Image
            key={url}
            src={url}
            width={44}
            height={44}
            style={{ objectFit: 'cover', borderRadius: 6 }}
            preview={{ mask: '预览' }}
          />
        ))}
        {list.length > 4 ? <Tag>+{list.length - 4}</Tag> : null}
      </Space>
    </Image.PreviewGroup>
  );
}

export function PetListPage() {
  const [rows, setRows] = useState(mockPets);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [detail, setDetail] = useState<PetRow | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<StatusFilterValue, number>> = { all: rows.length };
    rows.forEach((r) => {
      counts[r.auditStatus] = (counts[r.auditStatus] || 0) + 1;
    });
    return counts;
  }, [rows]);

  const displayRows = useMemo(() => {
    let list = filterByAuditField(rows, statusFilter);
    const q = keyword.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q)
          || p.userNickname.toLowerCase().includes(q)
          || (p.breedName || '').toLowerCase().includes(q)
          || (p.ownerPhone || '').includes(q)
          || (p.emergencyContactPhone || '').includes(q)
          || (p.emergencyContactName || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, keyword, statusFilter]);

  const patchRow = (id: string, patch: Partial<PetRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDetail((d) => (d && d.id === id ? { ...d, ...patch } : d));
  };

  const approve = (row: PetRow) => {
    patchRow(row.id, { auditStatus: 'approved', rejectReason: undefined });
    message.success(`已通过「${row.name}」档案审核`);
  };

  const openReject = (row: PetRow) => {
    setRejectModal({ id: row.id, name: row.name });
    setRejectReason(row.rejectReason || '');
  };

  const confirmReject = () => {
    if (!rejectModal) return;
    const reason = rejectReason.trim() || '资料不符合要求，请修改后重新提交';
    patchRow(rejectModal.id, {
      auditStatus: 'rejected',
      rejectReason: reason,
      certPublished: false,
    });
    message.warning('已驳回档案');
    setRejectModal(null);
    setRejectReason('');
  };

  const hideProfile = (row: PetRow) => {
    patchRow(row.id, { auditStatus: 'hidden', certPublished: false });
    message.info('已隐藏该档案');
  };

  const pendingCount = useMemo(() => countPendingStatus(rows, (r) => r.auditStatus), [rows]);
  useSyncMenuPendingBadge(MENU_PATH, pendingCount);

  const bulkApproveAll = () => {
    if (!pendingCount) return;
    setRows((prev) =>
      prev.map((r) =>
        r.auditStatus === 'pending'
          ? { ...r, auditStatus: 'approved', rejectReason: undefined }
          : r,
      ),
    );
    setDetail((d) =>
      d?.auditStatus === 'pending' ? { ...d, auditStatus: 'approved', rejectReason: undefined } : d,
    );
    message.success(`已通过 ${pendingCount} 份档案`);
  };

  return (
    <>
      <PageIntro
        title="宠物档案"
        description="对齐 pet-form：用户保存即生效，无需平台审核；含宠物疗愈（healingPet）。运营可对违规档案隐藏/标记。"
      />
      <StatusFilterBar value={statusFilter} onChange={setStatusFilter} counts={statusCounts} />
      <ListToolbar
        searchPlaceholder="宠物名 / 主人 / 品种 / 手机号"
        onSearch={setKeyword}
        bulkApprove={{ pendingCount, onConfirm: bulkApproveAll, unit: '份档案' }}
      />
      <Table
        rowKey="id"
        dataSource={displayRows}
        scroll={{ x: 1680 }}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条档案` }}
        columns={[
          { title: '宠物名', dataIndex: 'name', width: 88, fixed: 'left' },
          { title: '主人', dataIndex: 'userNickname', width: 100 },
          {
            title: '登录手机',
            width: 128,
            render: (_, r) => <PhoneCell phone={r.ownerPhone} emptyLabel="未授权" />,
          },
          {
            title: '紧急联系人',
            width: 96,
            render: (_, r) => r.emergencyContactName || '—',
          },
          {
            title: '联系电话',
            width: 128,
            render: (_, r) => <PhoneCell phone={r.emergencyContactPhone} />,
          },
          {
            title: '审核',
            dataIndex: 'auditStatus',
            width: 96,
            render: (s: AuditStatus) => <AuditStatusTag status={s} />,
          },
          {
            title: '免疫证明',
            width: 88,
            render: (_, r) =>
              r.vaccineProofUrl ? (
                <PetPhotoThumb src={r.vaccineProofUrl} alt={`${r.name}免疫证明`} />
              ) : (
                <Tag color="warning">未上传</Tag>
              ),
          },
          {
            title: '主照片',
            width: 76,
            render: (_, r) => <PetPhotoThumb src={r.avatarUrl} alt={`${r.name}主照片`} />,
          },
          {
            title: '多角度',
            width: 200,
            render: (_, r) => <PetGalleryCell photos={r.galleryPhotos} />,
          },
          {
            title: '免疫',
            dataIndex: 'vaccineStatus',
            width: 88,
            render: (s: PetVaccineStatus | string) => vaccineLabel(s),
          },
          {
            title: '宠物疗愈',
            width: 120,
            render: (_, r) =>
              r.healingPet ? (
                <Tag color="green">{r.healingBuddyType || '已开启'}</Tag>
              ) : (
                <Tag>未开启</Tag>
              ),
          },
          {
            title: '宠证',
            dataIndex: 'certPublished',
            width: 80,
            render: (v: boolean) => (v ? <Tag color="blue">已发布</Tag> : <Tag>—</Tag>),
          },
          { title: '提交时间', dataIndex: 'submittedAt', width: 150 },
          {
            title: '操作',
            width: 220,
            fixed: 'right',
            render: (_, r) => (
              <Space wrap size={0}>
                <Button type="link" size="small" onClick={() => setDetail(r)}>
                  查看资料
                </Button>
                {r.auditStatus === 'pending' && (
                  <>
                    <Button type="link" size="small" onClick={() => approve(r)}>
                      通过
                    </Button>
                    <Button type="link" size="small" danger onClick={() => openReject(r)}>
                      驳回
                    </Button>
                  </>
                )}
                {r.auditStatus === 'approved' && (
                  <Button type="link" size="small" onClick={() => hideProfile(r)}>
                    隐藏
                  </Button>
                )}
                {r.auditStatus === 'rejected' && (
                  <Button type="link" size="small" onClick={() => approve(r)}>
                    重新通过
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Drawer
        title={detail ? `${detail.name} · 档案资料` : '档案资料'}
        width={560}
        open={!!detail}
        onClose={() => setDetail(null)}
        extra={
          detail?.auditStatus === 'pending' ? (
            <Space>
              <Button type="primary" onClick={() => approve(detail)}>
                通过
              </Button>
              <Button danger onClick={() => openReject(detail)}>
                驳回
              </Button>
            </Space>
          ) : null
        }
      >
        {detail ? (
          <>
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="审核状态">
                <AuditStatusTag status={detail.auditStatus} />
              </Descriptions.Item>
              {detail.rejectReason ? (
                <Descriptions.Item label="驳回原因">{detail.rejectReason}</Descriptions.Item>
              ) : null}
              <Descriptions.Item label="主人">{detail.userNickname}</Descriptions.Item>
              <Descriptions.Item label="用户 ID">{detail.userId}</Descriptions.Item>
              <Descriptions.Item label="登录手机">
                <PhoneCell phone={detail.ownerPhone} emptyLabel="未授权" />
              </Descriptions.Item>
              <Descriptions.Item label="紧急联系人">{detail.emergencyContactName || '—'}</Descriptions.Item>
              <Descriptions.Item label="联系电话">
                <PhoneCell phone={detail.emergencyContactPhone} />
              </Descriptions.Item>
              <Descriptions.Item label="品种">
                {detail.species} · {detail.breedName || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="免疫">{vaccineLabel(detail.vaccineStatus)}</Descriptions.Item>
              <Descriptions.Item label="常活动区域">{detail.activityArea || '—'}</Descriptions.Item>
              <Descriptions.Item label="宠物疗愈">
                {detail.healingPet ? `已开启 · ${detail.healingBuddyType || '—'}` : '未开启'}
              </Descriptions.Item>
              {detail.healingIntro ? (
                <Descriptions.Item label="疗愈介绍">{detail.healingIntro}</Descriptions.Item>
              ) : null}
              <Descriptions.Item label="提交时间">{detail.submittedAt || '—'}</Descriptions.Item>
            </Descriptions>

            <DetailMediaSection
              title="免疫证明"
              urls={detail.vaccineProofUrl ? [detail.vaccineProofUrl] : []}
              size={120}
              emptyLabel="用户未上传免疫证明"
            />
            <DetailMediaSection
              title="主照片"
              urls={detail.avatarUrl ? [detail.avatarUrl] : []}
              size={120}
              emptyLabel="无"
            />
            <DetailMediaSection
              title="多角度照片"
              urls={detail.galleryPhotos || []}
              size={100}
              emptyLabel="未上传"
            />
          </>
        ) : null}
      </Drawer>

      <Modal
        title={rejectModal ? `驳回「${rejectModal.name}」档案` : '驳回'}
        open={!!rejectModal}
        onCancel={() => setRejectModal(null)}
        onOk={confirmReject}
        okText="确认驳回"
        okButtonProps={{ danger: true }}
      >
        <p style={{ marginBottom: 8, color: '#666' }}>用户将在小程序中看到驳回原因并引导修改档案。</p>
        <Input.TextArea
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="如：免疫证明不清晰、主照片非宠物正面等"
        />
      </Modal>
    </>
  );
}
