import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Image, Input, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useState } from 'react';
import { uploadAdminMedia } from '../services/admin-write';

const MAX_MB = 8;

interface SplashImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  placeholder?: string;
  hint?: string;
  previewMaxHeight?: number;
  /** 云存储目录前缀，如 admin/banners */
  uploadFolder?: string;
}

export function SplashImageUpload({
  value,
  onChange,
  placeholder = '或粘贴图片 URL（建议 750×1334，9:16）',
  hint = '支持本地上传（云存储）或粘贴 https / cloud:// 链接',
  previewMaxHeight = 220,
  uploadFolder = 'admin/content',
}: SplashImageUploadProps) {
  const [loading, setLoading] = useState(false);

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!file.type.startsWith('image/')) {
      message.error('请上传 JPG / PNG / WebP 等图片');
      return Upload.LIST_IGNORE;
    }
    if (file.size / 1024 / 1024 > MAX_MB) {
      message.error(`图片不能超过 ${MAX_MB}MB`);
      return Upload.LIST_IGNORE;
    }
    setLoading(true);
    void uploadAdminMedia(file as File, uploadFolder)
      .then((res) => {
        onChange?.(res.url || res.fileID);
        message.success('已上传到云存储');
      })
      .catch((e) => {
        message.error(e instanceof Error ? e.message : '上传失败');
      })
      .finally(() => setLoading(false));
    return false;
  };

  return (
    <div className="splash-image-field">
      {value ? (
        <div className="splash-image-preview-wrap">
          <Image
            src={value}
            alt="预览"
            className="splash-image-preview"
            style={{ maxHeight: previewMaxHeight }}
            fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='213'/%3E"
          />
          <Button type="link" danger size="small" onClick={() => onChange?.('')}>
            移除图片
          </Button>
        </div>
      ) : null}
      <Upload
        accept="image/jpeg,image/png,image/webp,image/gif"
        showUploadList={false}
        beforeUpload={beforeUpload}
      >
        <Button icon={loading ? <LoadingOutlined /> : <PlusOutlined />} disabled={loading}>
          {value ? '更换图片' : '上传图片'}
        </Button>
      </Upload>
      <Input
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        style={{ marginTop: 12 }}
        allowClear
      />
      {hint ? <p style={{ marginTop: 8, fontSize: 12, color: '#888' }}>{hint}</p> : null}
    </div>
  );
}
