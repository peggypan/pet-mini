import { Button, Input, Space, Tag, message } from 'antd';
import { PageIntro } from '../../components/PageIntro';
import { useCloudList } from '../../hooks/useCloudList';
import { fetchSensitiveWords, saveSensitiveWord } from '../../services/admin-data';
import { useState } from 'react';

export function SensitiveWordsPage() {
  const { rows, loading, reload } = useCloudList(() => fetchSensitiveWords(), []);
  const [input, setInput] = useState('');
  const words = rows.filter((r) => r.status !== 0).map((r) => r.word);

  const add = async () => {
    const w = input.trim();
    if (!w || words.includes(w)) return;
    try {
      await saveSensitiveWord(w, 1);
      setInput('');
      message.success('已添加');
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '添加失败');
    }
  };

  const remove = async (word: string) => {
    try {
      await saveSensitiveWord(word, 0);
      message.success('已移除');
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '移除失败');
    }
  };

  return (
    <>
      <PageIntro
        title="敏感词"
        description="对应 social-post 发布拦截（活体、私下诊疗等），已同步云库 sensitive_words。"
      />
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="新增敏感词"
          onPressEnter={() => void add()}
          style={{ width: 220 }}
          disabled={loading}
        />
        <Button type="primary" onClick={() => void add()} loading={loading}>
          添加
        </Button>
      </Space>
      <div>
        {words.map((w) => (
          <Tag
            key={w}
            closable
            onClose={(e) => {
              e.preventDefault();
              void remove(w);
            }}
            style={{ marginBottom: 8 }}
          >
            {w}
          </Tag>
        ))}
      </div>
    </>
  );
}
