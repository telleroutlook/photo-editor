# Canvas 刷新循环调试指南

## 📊 已添加的调试日志

### 1. **组件渲染追踪**
```javascript
🔄 CropCanvas render #N      // CropCanvas 渲染次数
🔄 CropTool render #N        // CropTool 渲染次数
```

**关键观察点**：
- 如果渲染计数持续增长，说明存在无限循环
- 正常情况下，初始加载应该只有 3-5 次渲染

---

### 2. **useCallback 函数重建追踪**
```javascript
✅ updateCropRect function recreated/initialized
```

**关键观察点**：
- 这个日志不应该频繁出现
- 如果在控制台看到大量重复，说明依赖项导致函数频繁重建

---

### 3. **Fabric.js 事件监听器追踪**
```javascript
🔧 Setting up Fabric.js event listeners    // 事件监听器创建
🔧 Cleaning up Fabric.js event listeners  // 事件监听器销毁
⚡ Fabric.js event triggered: object:modified    // 修改事件
⚡ Fabric.js event triggered: object:scaling     // 缩放事件
⚡ Fabric.js event triggered: object:moving      // 移动事件
```

**关键观察点**：
- "Setting up" 和 "Cleaning up" 交替出现 → useEffect 重复执行
- 大量 "triggered" 事件 → 可能是事件监听器被重复绑定

---

### 4. **状态更新追踪**
```javascript
🎯 updateCropRect called: {x, y, width, height}  // updateCropRect 执行
📦 handleCropChange in CropTool: {x, y, width, height}  // 父组件状态更新
```

**关键观察点**：
- 检查这些值是否在不断变化
- 如果在没有用户操作的情况下频繁调用，说明存在循环

---

## 🔍 预期的问题模式

### ❌ **渲染循环的症状**

控制台会显示类似这样的模式：
```
🔄 CropTool render #1
🔄 CropCanvas render #1
✅ updateCropRect function recreated
🔧 Setting up Fabric.js event listeners
🔄 CropCanvas render #2
✅ updateCropRect function recreated
🔧 Cleaning up Fabric.js event listeners
🔧 Setting up Fabric.js event listeners
🔄 CropCanvas render #3
✅ updateCropRect function recreated
🔧 Cleaning up Fabric.js event listeners
🔧 Setting up Fabric.js event listeners
... (无限循环)
```

---

## 🛠️ 根本原因分析

### 问题 1: `imageData` 对象引用不稳定

**位置**: `CropTool.tsx:170-174`

```typescript
// ❌ 当前代码：每次渲染都创建新对象
<CropCanvas
  imageData={{
    url: selectedImage.url,
    width: selectedImage.width,
    height: selectedImage.height,
  }}
/>
```

**问题**：即使内容相同，对象引用每次都不同，导致：
- `CropCanvas` 的 props 变化 → 重新渲染
- `updateCropRect` 的依赖项变化 → 函数重建
- useEffect 依赖项变化 → 事件监听器重复绑定

---

### 问题 2: `useCallback` 依赖项过多

**位置**: `CropCanvas.tsx:90`

```typescript
// ❌ 当前代码
const updateCropRect = useCallback(() => {
  // ...
}, [cropRectRef, canvasSize, imageData, onCropChange]);
```

**问题**：
- `imageData` 是对象，引用变化导致函数重建
- `onCropChange` 每次渲染都是新函数（见问题3）
- `canvasSize` 可能频繁变化

---

### 问题 3: `handleCropChange` 未使用 `useCallback`

**位置**: `CropTool.tsx:38-41`

```typescript
// ❌ 当前代码
const handleCropChange = (rect: CropRect) => {
  console.log('📦 handleCropChange in CropTool:', rect);
  setCropRect(rect);
};
```

**问题**：每次渲染都创建新函数，导致 `CropCanvas` 的 `onCropChange` prop 变化

---

## ✅ 修复方案

### 方案 1: 使用 `useMemo` 稳定 `imageData` 引用

在 `CropTool.tsx` 中：

```typescript
import { useMemo } from 'react';

export const CropTool = () => {
  const selectedImage = getSelectedImage();

  // ✅ 使用 useMemo 缓存 imageData 对象
  const imageData = useMemo(
    () => ({
      url: selectedImage.url,
      width: selectedImage.width,
      height: selectedImage.height,
    }),
    [selectedImage.url, selectedImage.width, selectedImage.height]
  );

  return (
    <CropCanvas
      imageData={imageData}  // 引用稳定
      // ...
    />
  );
};
```

---

### 方案 2: 优化 `updateCropRect` 的依赖项

在 `CropCanvas.tsx` 中：

```typescript
// ✅ 使用 useRef 存储最新值，避免依赖项
const latestImageDataRef = useRef(imageData);
useEffect(() => {
  latestImageDataRef.current = imageData;
}, [imageData]);

const latestCanvasSizeRef = useRef(canvasSize);
useEffect(() => {
  latestCanvasSizeRef.current = canvasSize;
}, [canvasSize]);

const updateCropRect = useCallback(() => {
  if (!cropRectRef.current) return;

  const rect = cropRectRef.current;
  const imageData = latestImageDataRef.current;
  const canvasSize = latestCanvasSizeRef.current;

  // ... 计算逻辑

  onCropChange(cropRect);
}, [cropRectRef, onCropChange]);  // 依赖项大幅减少
```

---

### 方案 3: 使用 `useCallback` 包装 `handleCropChange`

在 `CropTool.tsx` 中：

```typescript
import { useCallback } from 'react';

export const CropTool = () => {
  // ...

  // ✅ 使用 useCallback 稳定函数引用
  const handleCropChange = useCallback((rect: CropRect) => {
    console.log('📦 handleCropChange in CropTool:', rect);
    setCropRect(rect);
  }, []);  // 空依赖数组，函数永不重建

  // ...
};
```

---

### 方案 4: 事件监听器使用 `useRef`

更激进的优化，完全避免依赖 `updateCropRect`：

```typescript
// ✅ 将 updateCropRect 放入 ref，避免 useEffect 依赖
const updateCropRectRef = useRef<(() => void) | null>(null);

// 在组件中定义函数
useEffect(() => {
  updateCropRectRef.current = () => {
    if (!cropRectRef.current) return;
    // ... 计算逻辑
    onCropChange(cropRect);
  };
}, [onCropChange]);

// 事件监听器使用 ref
useEffect(() => {
  const canvas = fabricCanvasRef.current;
  if (!canvas || !cropRectRef.current) return;

  const handleObjectModified = () => {
    updateCropRectRef.current?.();
  };

  canvas.on('object:modified', handleObjectModified);
  // ...

  return () => {
    canvas.off('object:modified', handleObjectModified);
    // ...
  };
}, []);  // 空依赖数组，只运行一次！
```

---

## 🎯 推荐实施步骤

1. **先测试**：导入图片，观察控制台日志模式
2. **应用方案 1 + 方案 3**：最小改动，应该能解决 90% 的问题
3. **如果仍有问题**：应用方案 2，进一步优化依赖项
4. **终极方案**：方案 4，但需要更多重构

---

## 📝 验证成功的标志

修复后，控制台应该显示：

```
🔄 CropTool render #1
🔄 CropCanvas render #1
✅ updateCropRect function recreated
🔧 Setting up Fabric.js event listeners
🔄 CropCanvas render #2
✅ updateCropRect function recreated
🔧 Cleaning up Fabric.js event listeners
🔧 Setting up Fabric.js event listeners
🔄 CropCanvas render #3
✅ updateCropRect function recreated
🔧 Cleaning up Fabric.js event listeners
🔧 Setting up Fabric.js event listeners
🔄 CropCanvas render #4
(停止在这里，不再有新的渲染)
```

用户操作时应该只看到：
```
⚡ Fabric.js event triggered: object:scaling
🎯 updateCropRect called: {x: 10, y: 20, width: 100, height: 100}
📦 handleCropChange in CropTool: {x: 10, y: 20, width: 100, height: 100}
🔄 CropTool render #2
```

---

## 🚨 特别注意

### Fabric.js 事件的特殊性

`object:scaling` 和 `object:moving` 事件在拖拽过程中会**高频触发**（每秒数十次）。

**建议**：添加防抖（debounce）来减少状态更新频率

```typescript
import { debounce } from 'lodash';  // 或自己实现

const debouncedUpdateCropRect = useCallback(
  debounce(() => {
    updateCropRect();
  }, 16),  // 60fps
  []
);
```

---

## 🔗 相关资源

- [React useCallback 依赖项陷阱](https://react.dev/reference/react/useCallback#troubleshooting)
- [Fabric.js 事件文档](http://fabricjs.com/events)
- [React 渲染优化最佳实践](https://react.dev/learn/render-and-commit)
