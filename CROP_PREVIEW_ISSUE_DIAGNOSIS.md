# 裁剪预览图消失问题诊断

## 🐛 问题描述

**现象**：拖动裁剪框时，预览图消失

**日志输出**：
```
🔄 CropCanvas render #6
✅ updateCropRect ref updated
⚡ Fabric.js event triggered: object:modified
```

## 🔍 可能的原因

### 1. Canvas重新创建导致图像丢失

**位置**：`CropCanvas.tsx` Line 43-78

**问题**：
```typescript
useEffect(() => {
  if (!canvasRef.current) return;

  const sizeChanged =
    lastCanvasSizeRef.current.width !== canvasSize.width ||
    lastCanvasSizeRef.current.height !== canvasSize.height;

  if (!sizeChanged) {
    console.log('📏 Canvas size unchanged, skipping recreation');
    return;
  }

  // ❌ 如果canvasSize变化，会dispose整个canvas
  if (fabricCanvasRef.current) {
    fabricCanvasRef.current.dispose();
    fabricCanvasRef.current = null;
  }

  const canvas = new Canvas(canvasRef.current, {
    width: canvasSize.width,
    height: canvasSize.height,
    backgroundColor: '#1f2937',
    selection: false,
  });

  fabricCanvasRef.current = canvas;
}, [canvasSize]);
```

**根因**：如果window resize或其他因素导致`canvasSize`变化，整个canvas会被销毁并重建，导致：
1. 图像对象丢失
2. 裁剪框丢失
3. 事件监听器丢失

### 2. imageLoaded状态循环依赖

**位置**：`CropCanvas.tsx` Line 174-297

**问题**：
```typescript
useEffect(() => {
  // ... 加载图片逻辑 ...

  setImageLoaded(true); // Line 278
}, [imageData.url, canvasSize, imageLoaded]); // ❌ imageLoaded在依赖项中
```

**根因**：`imageLoaded`既是依赖项又在effect内被修改，可能导致：
1. 无限渲染循环（虽然有守卫）
2. 意外的重新加载

### 3. 频繁的组件重新渲染

**位置**：`CropCanvas.tsx` Line 19-25

**日志输出显示**：
```
🔄 CropCanvas render #1
🔄 CropCanvas render #2
🔄 CropCanvas render #3
🔄 CropCanvas render #4
🔄 CropCanvas render #5
🔄 CropCanvas render #6
```

**根因**：组件在短时间内渲染了6次，可能的触发源：
1. Parent组件状态变化（`App.tsx`中的cropRect更新）
2. `imageData.url` prop变化
3. `canvasSize` state变化
4. `imageLoaded` state变化

## ✅ 建议的修复方案

### 修复1：移除imageLoaded循环依赖

```typescript
// Line 174-297
useEffect(() => {
  if (!fabricCanvasRef.current || canvasSize.width === 0) return;

  const canvas = fabricCanvasRef.current;

  // ✅ 只在imageData.url变化时重新加载
  // 移除imageLoaded依赖项
  if (imageLoaded && canvas.getObjects().length > 0) {
    const hasImage = canvas.getObjects().some(obj => obj.type === 'image');
    if (hasImage) {
      console.log('🖼️ Image already loaded, skipping reload');
      return;
    }
  }

  // ... 加载图片逻辑 ...

}, [imageData.url, canvasSize]); // ✅ 移除imageLoaded依赖
```

### 修复2：优化Canvas重建逻辑

**选项A：只调整尺寸，不重建canvas**

```typescript
useEffect(() => {
  if (!canvasRef.current) return;

  if (fabricCanvasRef.current) {
    // ✅ 调整现有canvas尺寸而不是销毁重建
    fabricCanvasRef.current.setDimensions({
      width: canvasSize.width,
      height: canvasSize.height,
    });
    fabricCanvasRef.current.renderAll();
    console.log('📏 Canvas resized:', canvasSize);
    return;
  }

  // 只有在canvas不存在时才创建新的
  const canvas = new Canvas(canvasRef.current, {
    width: canvasSize.width,
    height: canvasSize.height,
    backgroundColor: '#1f2937',
    selection: false,
  });

  fabricCanvasRef.current = canvas;
}, [canvasSize]);
```

**选项B：阻止不必要的canvasSize更新**

在`updateCanvasSize`函数中添加阈值检查：

```typescript
// Line 81-94
useEffect(() => {
  const updateCanvasSize = () => {
    const containerWidth = Math.min(window.innerWidth - 32, 800);
    const scale = containerWidth / imageData.width;
    const width = containerWidth;
    const height = imageData.height * scale;

    // ✅ 只在变化超过1px时才更新
    setCanvasSize((prev) => {
      if (Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) {
        return prev; // 避免不必要的更新
      }
      return { width, height };
    });
  };

  updateCanvasSize();

  // ✅ 使用节流避免频繁resize
  let resizeTimeout: ReturnType<typeof setTimeout>;
  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateCanvasSize, 100);
  };

  window.addEventListener('resize', handleResize);
  return () => {
    clearTimeout(resizeTimeout);
    window.removeEventListener('resize', handleResize);
  };
}, [imageData.width, imageData.height]);
```

### 修复3：减少父组件不必要的re-render

**位置**：`App.tsx` Line 499的`handleCropChange`

**当前代码**：
```typescript
const handleCropChange = useCallback((rect: CropRect) => {
  console.log('📦 handleCropChange:', rect);
  setCropRect(rect); // ❌ 每次裁剪框变化都触发App re-render
}, []);
```

**问题**：每次拖动裁剪框都会：
1. 触发`setCropRect`
2. 导致`App`组件re-render
3. `App` re-render会传递新的props给`CropCanvas`
4. 导致`CropCanvas` re-render

**修复**：使用debounce或只在真正需要时更新

```typescript
const handleCropChange = useCallback((rect: CropRect) => {
  console.log('📦 handleCropChange:', rect);

  // ✅ 只在值真正变化时更新
  setCropRect((prev) => {
    if (prev.x === rect.x && prev.y === rect.y &&
        prev.width === rect.width && prev.height === rect.height) {
      return prev; // 避免不必要的更新
    }
    return rect;
  });
}, []);
```

## 🔧 推荐的修复顺序

1. **先修复修复1**（移除imageLoaded循环依赖）- 最简单，风险最低
2. **再修复修复2选项B**（添加canvasSize更新阈值）- 减少不必要的canvas操作
3. **最后修复修复3**（优化父组件更新）- 性能优化

## 📝 验证步骤

修复后测试：

1. 上传图片
2. 等待预览图加载完成
3. **拖动**裁剪框位置 → 预览图应保持显示
4. **调整**裁剪框大小 → 预览图应保持显示
5. 调整浏览器窗口大小 → 预览图应保持显示并自适应

## 🐛 调试建议

在修复过程中，保持这些console.log以帮助定位问题：

```typescript
// CropCanvas.tsx Line 21
console.log(`🔄 CropCanvas render #${renderCountRef.current}`, {
  imageDataChanged: imageData.url,
  aspectRatio,
  initialCropRect,
  canvasSize,
  imageLoaded,
});

// Line 56
console.log('🎨 Creating new canvas with size:', canvasSize);

// Line 194
console.log('🖼️ Loading image:', imageData.url);

// Line 189
console.log('🖼️ Image already loaded, skipping reload');
```

预期的正常输出（拖动裁剪框时）：
```
🔄 CropCanvas render #1  // 初始渲染
🔄 CropCanvas render #2  // canvasSize计算完成
🖼️ Loading image: blob:...
🔄 CropCanvas render #3  // imageLoaded = true
⚡ Fabric.js event triggered: object:moving  // 拖动
🎯 updateCropRect called: {x: 10, y: 20, ...}  // 防抖后更新
🔄 CropCanvas render #4  // cropRect更新
🖼️ Image already loaded, skipping reload  // ✅ 守卫生效，不重新加载
```

不应该出现的输出：
```
❌ 🎨 Creating new canvas  // 拖动时不应重建canvas
❌ 🖼️ Loading image  // 拖动时不应重新加载图片
```
