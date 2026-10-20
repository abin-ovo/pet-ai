# 小团应用图标

日期：2026-10-20。用于 0.1.3 及后续桌面版本。

设计采用鼠尾草绿圆角底、奶油白猫头、暖棕色五官和浅杏色耳朵。无文字、条纹或复杂装饰，小尺寸仍可辨认。透明外边距适配 macOS Dock；Windows 使用同一形象的多尺寸图标。

使用内置 imagegen 生成。源图为 `app-icon-source.png`（1254 × 1254，带 alpha），项目成品：

- `../../resources/icon.png`：1024 × 1024 PNG，用于窗口和开发版 Dock。
- `../../resources/icon.icns`：Mac 应用包图标，含 16–1024 像素图像。
- `../../resources/icon.ico`：Windows 可执行文件图标，含 16、24、32、48、64、128、256 像素图像。

`npm run icons` 使用 macOS 的 sips 和 iconutil 生成原生格式，不需要图像处理依赖。其他平台可直接使用项目内成品。macOS 托盘继续使用单色模板以适配系统明暗主题；Windows 托盘使用彩色新图标。

## 最终生成提示词

Use case: logo-brand. Asset type: final production desktop application icon for 小团, a warm original AI desktop kitten companion for macOS and Windows. Create ONE exquisitely simple, refined icon, square 1024x1024 composition, genuine transparent alpha outside its tile. A sage-green rounded-square tile centered in the canvas, occupying about 84% of the canvas with generous macOS-style outer safety margin and smoothly rounded corners. The tile has an almost imperceptible lighter-top darker-bottom tonal transition, essentially flat, no gloss. Center a large original cream-white kitten HEAD silhouette on the tile, about 73% of tile width: two softly pointed ears, very plump round cheeks, a smooth simple rounded chin. The silhouette is clean and confident, almost a friendly rice dumpling with ears. Warm muted peach inner ears; two small dark warm-brown oval eyes and one tiny brown nose with a short delicate curved mouth, a calm contented expression. Absolutely NO whiskers, stripes, fur details, blush spots, eyebrows, paws, full body, collar, heart, sparkle, lettering, AI symbols, border, texture, or watermark. No thick outlines. Flat vector-like graphic language with beautifully balanced curves and premium restraint. Color family matches an existing cream kitten desktop UI with sage-green controls: background sage around #647D69, kitten around #FFF5E5, inner ears #E9B8A0, face #5C493D. Strong contrast, clearly legible at small 16px/32px sizes. Front-facing, centered, very slight organic asymmetry in ears is welcome but mostly symmetrical. Tile should read as a native macOS app icon, with a restrained natural soft shadow immediately under tile; the rest is completely transparent, not white, no checkerboard baked into image. Deliver only the one icon, no mockup, no presentation frame, no text.
