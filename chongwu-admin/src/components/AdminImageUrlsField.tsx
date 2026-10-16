import { Button, Space, message } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { Upload } from 'antd';
import type { UploadProps } from 'antd';
import { uploadAdminMedia } from '../services/admin-write';

type Props = {
  value?: string[];
  onChange?: (urls: string[]) => void;
  max?: number;
  uploadFolder?: string;
};

export function AdminImageUrlsField({
  value = [],
  onChange,
  max = 6,
  uploadFolder = 'admin/content',
}: Props) {
  const urls = value || [];

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (urls.length >= max) {
      message.warning(`最多 ${max} 张`);
      return Upload.LIST_IGNORE;
    }
    void uploadAdminMedia(file as File, uploadFolder)
      .then((res) => {
        onChange?.([...urls, res.url || res.fileID]);
        message.success('已上传');
      })
      .catch((e) => message.error(e instanceof Error ? e.message : '上传失败'));
    return false;
  };

  const removeAt = (idx: number) => {
    onChange?.(urls.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <Space wrap style={{ marginBottom: 8 }}>
        {urls.map((url, i) => (
          <div key={`${url}-${i}`} style={{ position: 'relative' }}>
            <img
              src={url}
              alt=""
              style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }}
            />
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              style={{ position: 'absolute', top: 0, right: 0 }}
              onClick={() => removeAt(i)}
            />
          </div>
        ))}
      </Space>
      {urls.length < max ? (
        <Upload accept="image/*" showUploadList={false} beforeUpload={beforeUpload}>
          <Button icon={<PlusOutlined />} size="small">
            添加图片 ({urls.length}/{max})
          </Button>
        </Upload>
      ) : null}
    </div>
  );
}
