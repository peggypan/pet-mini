import { Button, Input, Space, Tag } from 'antd';
import { PageIntro } from '../../components/PageIntro';
import { sensitiveWordsSeed } from '../../mock/data';
import { useState } from 'react';

export function SensitiveWordsPage() {
  const [words, setWords] = useState(sensitiveWordsSeed);
  const [input, setInput] = useState('');

  const add = () => {
    const w = input.trim();
    if (!w || words.includes(w)) return;
    setWords([...words, w]);
    setInput('');
  };

  return (
    <>
      <PageIntro
        title="敏感词"
        description="对应 social-post 发布拦截（活体、私下诊疗等），后续同步到云函数校验。"
      />
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="新增敏感词"
          onPressEnter={add}
          style={{ width: 220 }}
        />
        <Button type="primary" onClick={add}>
          添加
        </Button>
      </Space>
      <div>
        {words.map((w) => (
          <Tag
            key={w}
            closable
            onClose={() => setWords(words.filter((x) => x !== w))}
            style={{ marginBottom: 8 }}
          >
            {w}
          </Tag>
        ))}
      </div>
    </>
  );
}
