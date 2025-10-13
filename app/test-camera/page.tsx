'use client';

import { useState, useRef } from 'react';

export default function CameraTestPage() {
  const [logs, setLogs] = useState<string[]>(['ログ:']);
  const videoRef = useRef<HTMLVideoElement>(null);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prevLogs => [...prevLogs, `- ${message}`]);
  };

  const startCamera = async () => {
    addLog('ボタンがクリックされました。');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      addLog('エラー: このブラウザはカメラAPIをサポートしていません。');
      alert('このブラウザはカメラAPIをサポートしていません。');
      return;
    }
    
    addLog('navigator.mediaDevices.getUserMedia を呼び出します...');
    
    // 💡【最重要】"できれば"背面カメラ、という柔軟な指定でテストします
    const constraints = {
      video: {
        facingMode: "environment" 
      }
    };
    addLog(`Constraints: ${JSON.stringify(constraints, null, 2)}`);

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      addLog('✅ ストリームの取得に成功しました！');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        addLog('ビデオ要素にストリームをセットしました。');
      }
    } catch (err: any) {
      addLog(`❌ エラーが発生しました: ${err.name}`);
      addLog(`エラーメッセージ: ${err.message}`);
      alert(`カメラの起動に失敗しました: ${err.name} - ${err.message}`);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', textAlign: 'center' }}>
      <h1>最小構成 カメラAPIテスト</h1>
      <p>このページは、POSアプリ本体とは独立してブラウザのカメラ機能を直接テストします。</p>
      
      <button 
        onClick={startCamera} 
        style={{ fontSize: '1.2rem', padding: '10px 20px', cursor: 'pointer', marginBottom: '20px' }}
      >
        カメラを起動
      </button>
      
      <video 
        ref={videoRef} 
        playsInline 
        autoPlay 
        muted 
        style={{ maxWidth: '100%', border: '2px solid black', backgroundColor: '#333' }}
      />
      
      <pre style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px', textAlign: 'left', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
        {logs.join('\n')}
      </pre>
    </div>
  );
}