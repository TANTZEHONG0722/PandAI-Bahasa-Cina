import express from 'express';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const app = express();
app.use(express.json());
app.use(express.static('public'));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/gemini', async (req, res) => {
    const { prompt } = req.body;
    let retries = 3; // 设定自动重试 3 次

    while (retries > 0) {
        try {
            // 请求最新版大模型
            const response = await ai.models.generateContent({
                model: 'gemini-3.6-flash',
                contents: prompt,
            });
            
            // 如果成功，立刻把数据传回前端并结束循环
            return res.json({ text: response.text });
            
        } catch (error) {
            // 检测是否为 503 高峰拥挤错误
            const isOverloaded = error.status === 503 || (error.message && error.message.includes('503'));
            
            if (isOverloaded) {
                retries--;
                console.log(`⚠️ Google 服务器当前拥挤，正在为您自动重试... (剩余尝试次数: ${retries})`);
                
                if (retries === 0) {
                    return res.status(503).json({ error: "Google云端大脑目前处于流量高峰期，请等待几秒钟后再点击发送！(503 High Demand)" });
                }
                
                // 停顿 2 秒后自动发起重试 (这在编程中叫 Exponential Backoff 策略)
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                // 如果是其他错误，直接报错
                console.error("AI 接口报错:", error);
                return res.status(500).json({ error: error.message || "服务器连接失败" });
            }
        }
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 服务器已成功启动！请打开浏览器访问: http://localhost:${PORT}`);
});