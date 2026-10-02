import { Image, Space, Tag, Typography } from 'antd';

/** 有 URL 用 URL；否则按 count + seed 生成 Mock 图（与云库未同步时的列表一致） */
export function resolveMediaUrls(
  urls: string[] | undefined,
  count: number | undefined,
  seed: string,
): string[] {
  if (urls?.length) return urls;
  const n = count || 0;
  if (!n) return [];
  return Array.from(
    { length: n },
    (_, i) => `https://picsum.photos/seed/${seed}-${i}/640/480`,
  );
}

/** 列表列内缩略图 + 预览 */
export function AdminImageThumbRow({
  urls,
  maxThumb = 4,
  thumbSize = 44,
}: {
  urls: string[];
  maxThumb?: number;
  thumbSize?: number;
}) {
  if (!urls.length) return <>—</>;
  return (
    <Image.PreviewGroup>
      <Space size={6} wrap>
        {urls.slice(0, maxThumb).map((url) => (
          <Image
            key={url}
            src={url}
            width={thumbSize}
            height={thumbSize}
            style={{ objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }}
            preview={{ mask: '查看' }}
          />
        ))}
        {urls.length > maxThumb ? <Tag>+{urls.length - maxThumb}</Tag> : null}
      </Space>
    </Image.PreviewGroup>
  );
}

export function AdminImageGallery({
  urls,
  size = 108,
  emptyLabel = '无',
}: {
  urls: string[];
  size?: number;
  emptyLabel?: string;
}) {
  if (!urls.length) return <Tag>{emptyLabel}</Tag>;
  return (
    <Image.PreviewGroup>
      <Space wrap size={10}>
        {urls.map((url) => (
          <Image
            key={url}
            src={url}
            width={size}
            height={size}
            style={{ objectFit: 'cover', borderRadius: 10 }}
            preview={{ mask: '放大' }}
          />
        ))}
      </Space>
    </Image.PreviewGroup>
  );
}

/** 查看资料 Drawer 内统一区块标题 + 相册 */
export function DetailMediaSection({
  title,
  urls,
  size = 108,
  emptyLabel = '未上传',
  hideWhenEmpty = false,
}: {
  title: string;
  urls: string[];
  size?: number;
  emptyLabel?: string;
  /** 无图时不渲染整块（多图区块用 false，单图资质用 false） */
  hideWhenEmpty?: boolean;
}) {
  if (hideWhenEmpty && !urls.length) return null;
  return (
    <>
      <p className="pet-cert-section-title">{title}</p>
      <AdminImageGallery urls={urls} size={size} emptyLabel={emptyLabel} />
    </>
  );
}

export type LabeledImageItem = { label: string; url?: string };

export function LabeledImageGrid({ items }: { items: LabeledImageItem[] }) {
  const list = items.filter((x) => x.url);
  if (!list.length) {
    return <Typography.Text type="secondary">暂无图片</Typography.Text>;
  }
  return (
    <Image.PreviewGroup>
      <div className="merchant-credential-grid">
        {list.map((item) => (
          <div key={item.label} className="merchant-credential-item">
            <Typography.Text type="secondary" className="merchant-credential-label">
              {item.label}
            </Typography.Text>
            <Image
              src={item.url}
              alt={item.label}
              style={{ width: '100%', borderRadius: 8, maxHeight: 180, objectFit: 'cover' }}
              preview={{ mask: '查看' }}
            />
          </div>
        ))}
      </div>
    </Image.PreviewGroup>
  );
}
