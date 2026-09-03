# 月末請求書生成器

GitHub Pages / PWA 版本。

## 功能
- 店铺选择
- 日期输入
- 税込金额输入
- 月度自动汇总
- A4 标准請求書预览
- 請求書番号 = 請求日 YYYYMMDD + 001
- 税率固定 8%
- 浏览器本地保存
- JSON 导出 / 导入备份
- 手机可添加到主屏幕

## 部署到 GitHub Pages
1. 新建 GitHub Repository。
2. 把本文件夹全部文件上传到仓库根目录。
3. Settings → Pages。
4. Build and deployment：Source 选择 Deploy from a branch。
5. Branch 选择 main，Folder 选择 / (root)。
6. 保存，等待 GitHub 生成网页地址。

## 注意
当前版本使用 localStorage 保存数据，只在当前设备当前浏览器里保存。
换手机/电脑不会自动同步。需要跨设备同步时可接 Firebase Firestore。
