import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Image, Input, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useState } from 'react';

const MAX_MB = 8;

interface SplashImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  placeholder?: string;
  hint?: string;
  previewMaxHeight?: number;
}

/** 开机广告素材：本地上传（Mock 为 Data URL）或粘贴 URL */
export function SplashImageUpload({
  value,
  onChange,
  placeholder = '或粘贴图片 URL（建议 750×1334，9:16）',
  hint = '支持本地上传或外链；小程序端按全屏比例展示',
  previewMaxHeight = 220,
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
    const reader = new FileReader();
    reader.onload = () => {
      onChange?.(String(reader.result || ''));
      setLoading(false);
      message.success('图片已添加（本地预览；接云开发后上传到云存储）');
    };
    reader.onerror = () => {
      setLoading(false);
      message.error('读取图片失败');
    };
    reader.readAsDataURL(file);
    return false;
  };

  return (
    <div className="splash-image-field">
      {value ? (
        <div className="splash-image-preview-wrap">
          <Image
            src={value}
            alt="闪屏预览"
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
      {hint ? <p className="splash-image-hint">{hint}</p> : null}
    </div>
  );
}
