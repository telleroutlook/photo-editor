let wasm;

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

const CompressionResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_compressionresult_free(ptr >>> 0, 1));

/**
 * @enum {0 | 1 | 2}
 */
export const CompressionFormat = Object.freeze({
    Jpeg: 0, "0": "Jpeg",
    WebP: 1, "1": "WebP",
    Png: 2, "2": "Png",
});

export class CompressionResult {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(CompressionResult.prototype);
        obj.__wbg_ptr = ptr;
        CompressionResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CompressionResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_compressionresult_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get size() {
        const ret = wasm.__wbg_get_compressionresult_size(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} arg0
     */
    set size(arg0) {
        wasm.__wbg_set_compressionresult_size(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get quality() {
        const ret = wasm.__wbg_get_compressionresult_quality(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set quality(arg0) {
        wasm.__wbg_set_compressionresult_quality(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) CompressionResult.prototype[Symbol.dispose] = CompressionResult.prototype.free;

/**
 *
 * * Compress RGBA image data to JPEG format
 * *
 * * # Arguments
 * * * `input` - RGBA image data (4 bytes per pixel, row-major order)
 * * * `width` - Image width in pixels
 * * * `height` - Image height in pixels
 * * * `quality` - JPEG quality (1-100)
 * * * `output` - Output buffer (pre-allocated, same size as input)
 * *
 * * # Returns
 * * Number of bytes written to output buffer
 *
 * @param {Uint8Array} input
 * @param {number} width
 * @param {number} height
 * @param {number} quality
 * @param {Uint8Array} output
 * @returns {number}
 */
export function compress_jpeg(input, width, height, quality, output) {
    const ptr0 = passArray8ToWasm0(input, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    var ptr1 = passArray8ToWasm0(output, wasm.__wbindgen_malloc);
    var len1 = WASM_VECTOR_LEN;
    const ret = wasm.compress_jpeg(ptr0, len0, width, height, quality, ptr1, len1, output);
    return ret >>> 0;
}

/**
 *
 * * Compress RGBA image data to PNG format
 * *
 * * Note: PNG is lossless compression. The quality parameter controls
 * * compression level (Fast/Default/High/Best) for trade-off between size and speed.
 * *
 * * # Arguments
 * * * `input` - RGBA image data (4 bytes per pixel, row-major order)
 * * * `width` - Image width in pixels
 * * * `height` - Image height in pixels
 * * * `quality` - PNG compression level hint (1-100, maps to compression type)
 * * * `output` - Output buffer (pre-allocated, same size as input)
 * *
 * * # Returns
 * * Number of bytes written to output buffer
 *
 * @param {Uint8Array} input
 * @param {number} width
 * @param {number} height
 * @param {number} quality
 * @param {Uint8Array} output
 * @returns {number}
 */
export function compress_png(input, width, height, quality, output) {
    const ptr0 = passArray8ToWasm0(input, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    var ptr1 = passArray8ToWasm0(output, wasm.__wbindgen_malloc);
    var len1 = WASM_VECTOR_LEN;
    const ret = wasm.compress_png(ptr0, len0, width, height, quality, ptr1, len1, output);
    return ret >>> 0;
}

/**
 *
 * * Compress image to target file size using binary search
 * *
 * * Uses binary search to find the optimal quality parameter that
 * * produces a compressed image close to the target file size.
 * *
 * * # Arguments
 * * * `input` - RGBA image data (4 bytes per pixel, row-major order)
 * * * `width` - Image width in pixels
 * * * `height` - Image height in pixels
 * * * `target_size` - Target file size in bytes
 * * * `format` - Compression format (Jpeg, WebP, or Png)
 * * * `output` - Output buffer (pre-allocated, same size as input)
 * *
 * * # Returns
 * * CompressionResult containing actual size and quality used
 *
 * @param {Uint8Array} input
 * @param {number} width
 * @param {number} height
 * @param {number} target_size
 * @param {CompressionFormat} format
 * @param {Uint8Array} output
 * @returns {CompressionResult}
 */
export function compress_to_size(input, width, height, target_size, format, output) {
    const ptr0 = passArray8ToWasm0(input, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    var ptr1 = passArray8ToWasm0(output, wasm.__wbindgen_malloc);
    var len1 = WASM_VECTOR_LEN;
    const ret = wasm.compress_to_size(ptr0, len0, width, height, target_size, format, ptr1, len1, output);
    return CompressionResult.__wrap(ret);
}

/**
 *
 * * Compress RGBA image data to WebP format
 * *
 * * # Arguments
 * * * `input` - RGBA image data (4 bytes per pixel, row-major order)
 * * * `width` - Image width in pixels
 * * * `height` - Image height in pixels
 * * * `quality` - WebP quality (1-100)
 * * * `output` - Output buffer (pre-allocated, same size as input)
 * *
 * * # Returns
 * * Number of bytes written to output buffer
 *
 * @param {Uint8Array} input
 * @param {number} width
 * @param {number} height
 * @param {number} quality
 * @param {Uint8Array} output
 * @returns {number}
 */
export function compress_webp(input, width, height, quality, output) {
    const ptr0 = passArray8ToWasm0(input, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    var ptr1 = passArray8ToWasm0(output, wasm.__wbindgen_malloc);
    var len1 = WASM_VECTOR_LEN;
    const ret = wasm.compress_webp(ptr0, len0, width, height, quality, ptr1, len1, output);
    return ret >>> 0;
}

const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg___wbindgen_copy_to_typed_array_db832bc4df7216c1 = function(arg0, arg1, arg2) {
        new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(getArrayU8FromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg___wbindgen_throw_dd24417ed36fc46e = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg_log_1d990106d99dacb7 = function(arg0) {
        console.log(arg0);
    };
    imports.wbg.__wbg_log_fd6486c6d5396ce5 = function(arg0, arg1) {
        console.log(arg0, arg1);
    };
    imports.wbg.__wbindgen_cast_2241b6af4c4b2941 = function(arg0, arg1) {
        // Cast intrinsic for `Ref(String) -> Externref`.
        const ret = getStringFromWasm0(arg0, arg1);
        return ret;
    };
    imports.wbg.__wbindgen_cast_d6cd19b81560fd6e = function(arg0) {
        // Cast intrinsic for `F64 -> Externref`.
        const ret = arg0;
        return ret;
    };
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_externrefs;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
    };

    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('photo_editor_compress_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;
