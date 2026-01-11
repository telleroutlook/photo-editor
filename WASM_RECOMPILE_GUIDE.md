# WASM Core Module 重新编译指南

## 🎯 问题描述

当前裁剪功能报错：`Error: expected instance of CropRect`

**根本原因**：
- Rust WASM绑定的 `CropRect` 是一个类，不是普通接口
- JavaScript端传递的是普通对象 `{x, y, width, height}`
- WASM函数 `crop_image` 需要 `CropRect` 类的实例

## 📝 需要修改的文件

### 1. `wasm-src/core/src/lib.rs`

**已修改内容**（已在本地完成）：

```rust
#[wasm_bindgen]
pub struct CropRect {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

// ✅ 添加构造函数
#[wasm_bindgen]
impl CropRect {
    #[wasm_bindgen(constructor)]
    pub fn new(x: u32, y: u32, width: u32, height: u32) -> CropRect {
        CropRect { x, y, width, height }
    }
}
```

**修改说明**：
- 为 `CropRect` 结构体添加 `impl` 块
- 使用 `#[wasm_bindgen(constructor)]` 导出构造函数
- 这样JavaScript可以使用 `new CropRect(x, y, width, height)` 创建实例

### 2. `src/workers/coreWorker.ts`

**需要修改的位置** - Line 66-95 的 `handleCropImage` 函数：

**当前代码**：
```typescript
async function handleCropImage(message: WorkerMessage<any>): Promise<void> {
  const { imageData, width, height, cropRect } = message.payload;

  // ... validation ...

  // ❌ 错误：直接传递普通对象
  await wasmModule.crop_image(
    input,
    width,
    height,
    cropRect,  // <- 这是普通对象，不是CropRect实例
    output
  );
}
```

**修改后**：
```typescript
async function handleCropImage(message: WorkerMessage<any>): Promise<void> {
  const { imageData, width, height, cropRect } = message.payload;

  // ... validation ...

  // ✅ 正确：使用WASM导出的CropRect类创建实例
  const wasmCropRect = new (wasmModule as any).CropRect(
    cropRect.x,
    cropRect.y,
    cropRect.width,
    cropRect.height
  );

  try {
    await wasmModule.crop_image(
      input,
      width,
      height,
      wasmCropRect,  // <- 传递CropRect类实例
      output
    );
  } finally {
    // 释放WASM内存
    wasmCropRect.free();
  }
}
```

## 🔨 编译步骤

### 前置要求

确保已安装：
```bash
# 检查Rust工具链
rustc --version
cargo --version

# 检查wasm-pack
wasm-pack --version

# 如果未安装wasm-pack
cargo install wasm-pack
```

### 编译命令

```bash
# 1. 进入core模块目录
cd wasm-src/core

# 2. 编译WASM模块
wasm-pack build --target web --out-dir ../../public/wasm/core

# 3. 返回项目根目录
cd ../..

# 4. 验证生成的文件
ls -lh public/wasm/core/
# 应该看到：
# - photo_editor_core.js (JavaScript绑定)
# - photo_editor_core_bg.wasm (WASM二进制)
# - photo_editor_core.d.ts (TypeScript类型定义)
```

## ✅ 验证步骤

### 1. 检查生成的TypeScript定义

```bash
cat public/wasm/core/photo_editor_core.d.ts
```

应该包含：
```typescript
export class CropRect {
  free(): void;
  constructor(x: number, y: number, width: number, height: number);
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### 2. 检查JavaScript绑定

```bash
grep -A10 "class CropRect" public/wasm/core/photo_editor_core.js
```

应该包含构造函数的代码。

### 3. 本地测试

```bash
# 启动开发服务器
npm run dev

# 测试裁剪功能：
# 1. 上传图片
# 2. 调整裁剪框
# 3. 点击 Apply
# 4. 应该成功裁剪并下载
```

## 🚀 部署步骤

编译成功后：

```bash
# 1. 构建生产版本
npm run build

# 2. 部署到Cloudflare Pages
npm run deploy

# 3. 验证新版本
# 访问部署后的URL，测试裁剪功能
```

## 📋 完整文件变更清单

### 必须修改的文件：
- ✅ `wasm-src/core/src/lib.rs` - 添加CropRect构造函数（已完成）
- ⚠️ `src/workers/coreWorker.ts` - 修改handleCropImage使用构造函数

### 需要重新生成的文件（编译产物）：
- `public/wasm/core/photo_editor_core.js`
- `public/wasm/core/photo_editor_core_bg.wasm`
- `public/wasm/core/photo_editor_core.d.ts`
- `public/wasm/core/photo_editor_core_bg.wasm.d.ts`

## 🐛 预期修复的问题

1. ✅ **CropRect实例化错误** - `Error: expected instance of CropRect`
2. ⚠️ **预览图消失问题** - 可能需要额外调试CropCanvas组件（另外处理）

## 📞 后续步骤

编译完成后，请：
1. 提交编译后的WASM文件到Git
2. 推送到远程仓库
3. 通知我，我会拉取并部署测试

---

## 🔍 调试提示

如果编译后仍有问题，在浏览器控制台检查：

```javascript
// 测试CropRect构造函数是否可用
const module = await import('/wasm/core/photo_editor_core.js');
await module.default();
const rect = new module.CropRect(0, 0, 100, 100);
console.log('CropRect instance:', rect);
console.log('x:', rect.x, 'y:', rect.y, 'width:', rect.width, 'height:', rect.height);
rect.free(); // 释放内存
```

预期输出：应该能成功创建实例并访问属性。
