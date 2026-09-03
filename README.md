# 月末請求書生成器 Firebase 正式版

## 已包含
- Firebase Email/Password 登录
- Firestore 真正保存
- 手机 / 电脑自动同步
- 记录删除
- 店铺资料保存
- 月度汇总
- 单店 PDF 直接下载
- 本月全部店铺 PDF 批量打包下载 ZIP
- 請求書番号 = 請求日 YYYYMMDD + 001
- 固定 8% 税率
- GitHub Pages 可直接部署

## 1. Firebase 设置

### A. 创建 Web App
Firebase Console → Project settings → Your apps → Web

取得：
- apiKey
- authDomain
- projectId
- appId

然后打开 `firebase-config.js` 填入。

### B. 开启 Authentication
Firebase Console → Authentication → Sign-in method

开启：
`Email/Password`

### C. 创建 Firestore Database
Firebase Console → Firestore Database → Create database

然后把本项目的 `firestore.rules` 内容复制到：
Firestore Database → Rules

点击 Publish。

## 2. GitHub Pages 部署
把本文件夹所有文件上传到 GitHub 仓库根目录。

GitHub：
Settings → Pages → Build and deployment

设置：
- Source: Deploy from a branch
- Branch: main
- Folder: / (root)

保存。

## 3. 首次使用
打开网页：
1. 输入邮箱和密码
2. 点击“注册新账号”
3. 之后手机和电脑使用同一邮箱密码登录
4. 数据会自动同步

## 4. PDF
“月度汇总”中：
- 每家店可单独点“生成 PDF”
- “一键生成本月全部 PDF”会下载一个 ZIP，里面是一家店一个 PDF

## 说明
当前 PDF 为浏览器端直接生成，不依赖服务器。
为了兼容 GitHub Pages，Firebase SDK、jsPDF、JSZip 使用 CDN，因此首次打开网页需要网络。


## 修正版说明
- Firebase 配置已重新按控制台原文写入：`bill-ef55b`
- 明细金额直接使用录入的“税込金额”
- 月度合计 = 所有录入税込金额直接相加
- 消费税只在整张請求書最后统一反算一次：
  - 税抜参考额 = floor(税込合计 / 1.08)
  - 内含消费税 = 税込合计 - 税抜参考额
- 不再对每一笔明细分别反算税额，因此不会产生逐笔舍入导致的 1～几円差额


## V3 日文/中文 PDF 修正
此前 jsPDF 默认 Helvetica 字体不支持日文/中文，因此店名、地址会乱码。
本版改为：浏览器先按系统日文字体渲染完整 A4 請求書，再写入 PDF。
因此：
- 日文/中文店名、地址不会乱码
- 不需要额外字体文件
- PDF 仍然是一键直接下载
- PDF 中的文字会以页面图像形式保存，不能逐字选择复制
