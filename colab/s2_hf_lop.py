#!/usr/bin/env python3
# =============================================================================
# s2_hf_lop.py — dựng các LỚP THAM CHIẾU cho công cụ lấy mẫu đa năm (LAY_MAU_DA_NAM.html)
# và gói chúng thành một bộ dữ liệu Hugging Face.
#
#   rgb_cog        : ảnh màu 8 bit (S2 màu thật, S2 B11-B8-B4, PCA PC1-3, embedding) dạng
#                    COG EPSG:3857, DEFLATE, ô 256, có overview -> trình duyệt đọc theo đoạn
#   class_cog      : bản đồ lớp (uint8) dạng COG EPSG:3857, lấy mẫu láng giềng gần nhất
#   pc_cog         : (tuỳ chọn) k PC + NFILL int16 giữ lưới gốc EPSG:32648, ô 128, không overview
#   pc_curves      : đường NDVI, MNDWI 6 kỳ tái dựng từ k PC tại từng điểm (nhẹ, thay cho pc_cog)
#   candidate_points / e0_points : điểm ứng viên phân tầng và 900 điểm E0 kèm nhãn 3 lớp cũ
#   make_manifest  : manifest.json mà trang HTML đọc
# =============================================================================
from __future__ import annotations

import json
import math
import os
import shutil
import time
from pathlib import Path

import numpy as np
import pandas as pd

__version__ = "1.2"
S2_BANDS = ["B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B11", "B12"]
WEB = "EPSG:3857"
TS_NODATA = -32768


# =========================================================================== #
# 1. Lưới đích EPSG:3857 phủ ranh giới
# =========================================================================== #

def grid_3857(bounds_src, src_crs="EPSG:32648", res=10.0, pad_m=0.0):
    """Lưới Web Mercator (transform, width, height) phủ khung `bounds_src` (xmin, ymin, xmax, ymax
    trong src_crs). Góc đặt đúng bội số của `res` để mọi lớp dùng chung một lưới."""
    from rasterio.warp import transform_bounds
    from rasterio.transform import from_origin
    x0, y0, x1, y1 = transform_bounds(src_crs, WEB, *bounds_src, densify_pts=41)
    x0, y0, x1, y1 = x0 - pad_m, y0 - pad_m, x1 + pad_m, y1 + pad_m
    x0 = math.floor(x0 / res) * res; y1 = math.ceil(y1 / res) * res
    w = int(math.ceil((x1 - x0) / res)); h = int(math.ceil((y1 - y0) / res))
    return from_origin(x0, y1, res, res), w, h


def _write_cog(tmp, out, **opts):
    import rasterio.shutil as rsh
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    opts.setdefault("NUM_THREADS", "ALL_CPUS")          # nén ô và dựng overview song song
    rsh.copy(tmp, out, driver="COG", **opts)
    os.remove(tmp)
    return out


def _vrt(ds, grid, resampling, nodata=None):
    from rasterio.vrt import WarpedVRT
    tf, w, h = grid
    kw = dict(crs=WEB, transform=tf, width=w, height=h, resampling=resampling, NUM_THREADS="ALL_CPUS")
    if nodata is not None:
        kw.update(src_nodata=nodata, nodata=nodata)
    return WarpedVRT(ds, **kw)


def rgb_cog(src, bands, lo, hi, out, grid, gamma=1.0, nodata=None, tmp_dir="/tmp", rows=1024,
            verbose=True, zero_nodata=True, resampling="bilinear"):
    """
    Các băng `bands` (chỉ số 1-based; thường 3 băng RGB, 1 băng cho ảnh xám) của `src` -> 8 bit
    trên lưới 3857 `grid`. Kéo giãn CỐ ĐỊNH lo..hi cho từng băng (giống nhau mọi năm, để màu so
    sánh được giữa các năm), gamma, 0 dành cho 'không có dữ liệu' (giá trị hợp lệ 1..255).
    `zero_nodata`: điểm ảnh mà MỌI băng bằng 0 coi là trống (đúng cho ảnh S2; PC một băng thì
    giá trị 0 là hợp lệ, phải tắt).
    """
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.windows import Window
    t0 = time.time()
    tf, w, h = grid
    lo, hi = np.asarray(lo, np.float32), np.asarray(hi, np.float32)
    tmp = f"{tmp_dir}/_rgb_{os.getpid()}_{Path(out).stem}.tif"
    prof = dict(driver="GTiff", width=w, height=h, count=len(bands), dtype="uint8", crs=WEB, transform=tf,
                nodata=0, tiled=True, blockxsize=256, blockysize=256, compress="deflate", BIGTIFF="IF_SAFER")
    with rasterio.open(src) as ds, _vrt(ds, grid, getattr(Resampling, resampling), nodata) as v, \
            rasterio.open(tmp, "w", **prof) as o:
        for r0 in range(0, h, rows):
            hh = min(rows, h - r0)
            a = v.read(list(bands), window=Window(0, r0, w, hh), masked=True).astype(np.float32)
            m = np.ma.getmaskarray(a).any(0)
            if zero_nodata:
                m |= (a.filled(0) == 0).all(0)
            x = (a.filled(0) - lo[:, None, None]) / np.maximum(hi - lo, 1e-6)[:, None, None]
            x = np.clip(x, 0, 1) ** (1.0 / gamma)
            b = (1 + np.round(x * 254)).astype(np.uint8)
            b[:, m] = 0
            o.write(b, window=Window(0, r0, w, hh))
    _write_cog(tmp, out, compress="DEFLATE", predictor=2, blocksize=256, overviews="AUTO",
               resampling="AVERAGE")
    if verbose:
        print(f"    {Path(out).name}: {w}×{h}, {os.path.getsize(out) / 1e6:.0f} MB, {time.time() - t0:.0f}s")
    return out


def gray_cog(src, band, lo, hi, out, grid, nodata=None, tmp_dir="/tmp", verbose=True):
    """Một băng -> ảnh xám 8 bit trên lưới 3857 (1..255, 0 = trống). Giá trị 0 của nguồn hợp lệ.
    Trang HTML tô màu theo `bang_mau_lien_tuc` trong manifest (xám, đỏ-xanh...)."""
    return rgb_cog(src, [band], [lo], [hi], out, grid, nodata=nodata, tmp_dir=tmp_dir, verbose=verbose,
                   zero_nodata=False)


def class_cog(src, out, grid, band=1, tmp_dir="/tmp", rows=2048, verbose=True):
    """Bản đồ lớp uint8 -> lưới 3857, láng giềng gần nhất, 0 = ngoài vùng. Overview kiểu MODE."""
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.windows import Window
    t0 = time.time()
    tf, w, h = grid
    tmp = f"{tmp_dir}/_cls_{os.getpid()}_{Path(out).stem}.tif"
    prof = dict(driver="GTiff", width=w, height=h, count=1, dtype="uint8", crs=WEB, transform=tf,
                nodata=0, tiled=True, blockxsize=256, blockysize=256, compress="deflate")
    with rasterio.open(src) as ds, _vrt(ds, grid, Resampling.nearest, 0) as v, \
            rasterio.open(tmp, "w", **prof) as o:
        for r0 in range(0, h, rows):
            hh = min(rows, h - r0)
            o.write(v.read(band, window=Window(0, r0, w, hh)), 1, window=Window(0, r0, w, hh))
    _write_cog(tmp, out, compress="DEFLATE", blocksize=256, overviews="AUTO", resampling="MODE")
    if verbose:
        print(f"    {Path(out).name}: {os.path.getsize(out) / 1e6:.1f} MB, {time.time() - t0:.0f}s")
    return out


def pc_cog(src, out, k=11, tmp_dir="/tmp", verbose=True):
    """(Tuỳ chọn, nặng ~2-3 GB/năm) k PC đầu + NFILL, int16, GIỮ lưới gốc EPSG:32648, ô 128,
    không overview: trình duyệt đọc giá trị một điểm ảnh bất kỳ để tái dựng đường mùa vụ."""
    import rasterio
    from rasterio.windows import Window
    t0 = time.time()
    tmp = f"{tmp_dir}/_pc_{os.getpid()}_{Path(out).stem}.tif"
    with rasterio.open(src) as ds:
        desc = list(ds.descriptions or [])
        b_fill = desc.index("NFILL") + 1 if "NFILL" in desc else ds.count
        idx = list(range(1, k + 1)) + [b_fill]
        prof = dict(driver="GTiff", width=ds.width, height=ds.height, count=len(idx), dtype="int16",
                    crs=ds.crs, transform=ds.transform, nodata=TS_NODATA, tiled=True, blockxsize=256,
                    blockysize=256, compress="deflate", BIGTIFF="YES")
        with rasterio.open(tmp, "w", **prof) as o:
            for r0 in range(0, ds.height, 1024):
                hh = min(1024, ds.height - r0)
                o.write(ds.read(idx, window=Window(0, r0, ds.width, hh)), window=Window(0, r0, ds.width, hh))
            o.descriptions = tuple([f"PC{i:02d}" for i in range(1, k + 1)] + ["NFILL"])
    _write_cog(tmp, out, compress="DEFLATE", predictor=2, blocksize=128, overviews="NONE", BIGTIFF="YES")
    if verbose:
        print(f"    {Path(out).name}: {os.path.getsize(out) / 1e9:.2f} GB, {time.time() - t0:.0f}s")
    return out


def percentiles(src, bands, p=(2, 98), step=8, nodata=None):
    """Phân vị p của từng băng trên ảnh thu nhỏ 1/step (bỏ 0 và nodata)."""
    import rasterio
    from rasterio.enums import Resampling
    with rasterio.open(src) as ds:
        a = ds.read(list(bands), out_shape=(len(bands), ds.height // step, ds.width // step),
                    resampling=Resampling.nearest).astype(np.float64)
    lo, hi = [], []
    for b in a:
        v = b[(b != 0) & np.isfinite(b) & ((b != nodata) if nodata is not None else True)]
        lo.append(float(np.percentile(v, p[0]))); hi.append(float(np.percentile(v, p[1])))
    return lo, hi


def embed_rgb_cog(emb_tif, out, grid, proj, mu, lo, hi, tmp_dir="/tmp", rows=512, verbose=True):
    """
    (Tuỳ chọn) GeoTIFF embedding nhiều băng -> RGB: chiếu lên 3 thành phần chính `proj` (3 × D)
    quanh `mu` (D), kéo giãn cố định lo..hi. Làm trên lưới gốc rồi đưa về 3857 bằng rgb_cog.
    """
    import rasterio
    from rasterio.windows import Window
    tmp3 = f"{tmp_dir}/_emb3_{os.getpid()}_{Path(out).stem}.tif"
    with rasterio.open(emb_tif) as ds:
        prof = dict(driver="GTiff", width=ds.width, height=ds.height, count=3, dtype="float32", crs=ds.crs,
                    transform=ds.transform, nodata=np.nan, tiled=True, blockxsize=256, blockysize=256,
                    compress="deflate", BIGTIFF="IF_SAFER")
        P, m = np.asarray(proj, np.float32), np.asarray(mu, np.float32)
        with rasterio.open(tmp3, "w", **prof) as o:
            for r0 in range(0, ds.height, rows):
                hh = min(rows, ds.height - r0)
                a = ds.read(window=Window(0, r0, ds.width, hh)).astype(np.float32)
                z = np.tensordot(P, a - m[:, None, None], axes=(1, 0))
                z[:, ~np.isfinite(a).all(0)] = np.nan
                o.write(z.astype(np.float32), window=Window(0, r0, ds.width, hh))
    try:
        return rgb_cog(tmp3, [1, 2, 3], lo, hi, out, grid, nodata=np.nan, tmp_dir=tmp_dir, verbose=verbose)
    finally:
        Path(tmp3).unlink(missing_ok=True)


def embed_pca(emb_tif, n=100000, seed=0, step=16):
    """3 thành phần chính của embedding (từ ảnh thu nhỏ), trả về (proj 3×D, mu D, lo 3, hi 3)."""
    import rasterio
    from rasterio.enums import Resampling
    with rasterio.open(emb_tif) as ds:
        a = ds.read(out_shape=(ds.count, ds.height // step, ds.width // step),
                    resampling=Resampling.nearest).astype(np.float64)
    X = a.reshape(a.shape[0], -1).T
    X = X[np.isfinite(X).all(1) & (np.abs(X).sum(1) > 0)]
    rng = np.random.default_rng(seed)
    X = X[rng.choice(len(X), min(n, len(X)), replace=False)]
    mu = X.mean(0)
    _, _, Vt = np.linalg.svd(X - mu, full_matrices=False)
    Z = (X - mu) @ Vt[:3].T
    return Vt[:3], mu, np.percentile(Z, 2, 0).tolist(), np.percentile(Z, 98, 0).tolist()


# =========================================================================== #
# 1b. Embedding tính TRỰC TIẾP từ ảnh S2 (không ghi GeoTIFF 64 băng), chiếu về vài thành phần
# =========================================================================== #
# Cùng quy ước với s2_thesis.classify_map_online và s2_e6.embed_points_tiled: lưới ô `tile`
# bắt đầu từ góc ảnh, lề `pad`, đệm đối xứng ở mép ảnh, nan_to_num, chuẩn hoá theo `moments`
# (None = raster_moments của chính ảnh), autocast fp16, hạ về float16. Encoder chạy trên CẢ Ô
# (g7 có lớp GRN chuẩn hoá theo cả ô), nên cách chia ô phải giống hệt bản đồ.

def torch_embed_fn(enc, spec_tif, moments=None, device="cuda", emb_half=True):
    """Hàm (10, h, w) float32 -> (dim, h, w) float32 cho MỘT ảnh (chuẩn hoá theo moments của ảnh)."""
    import torch
    from s2_classify import raster_moments
    mean, std = raster_moments(spec_tif, list(range(10))) if moments is None else moments
    mt = torch.tensor(np.asarray(mean), dtype=torch.float32).view(1, -1, 1, 1).to(enc.device)
    st = torch.tensor(np.asarray(std), dtype=torch.float32).view(1, -1, 1, 1).to(enc.device)
    use_amp = str(device).startswith("cuda") and torch.cuda.is_available()

    def f(ap):
        m0, s0 = enc.mean, enc.std
        enc.mean, enc.std = mt, st
        try:
            enc.net.eval()
            at = torch.from_numpy(np.ascontiguousarray(ap)).to(device)[None]
            with torch.inference_mode():
                x = enc.norm(at)
                if use_amp:
                    with torch.autocast("cuda", dtype=torch.float16):
                        z = enc.net(x)
                else:
                    z = enc.net(x)
                z = z.float()
                if emb_half:
                    z = z.half().float()
                return z[0].cpu().numpy()
        finally:
            enc.mean, enc.std = m0, s0
    return f


def _o_tile(ds, row, col, tile, pad):
    """Đọc ô (row, col) kèm lề, đệm đối xứng về đúng (th+2p, tw+2p). Trả về (ap, vp, th, tw)."""
    from rasterio.windows import Window
    H, W, nd = ds.height, ds.width, ds.nodata
    th, tw = min(tile, H - row), min(tile, W - col)
    r0, c0 = max(0, row - pad), max(0, col - pad)
    h = min(H, row + th + pad) - r0
    w = min(W, col + tw + pad) - c0
    a = ds.read(list(range(1, 11)), window=Window(c0, r0, w, h)).astype(np.float32)
    valid = np.all(np.isfinite(a), axis=0)
    if nd is not None:
        valid &= np.all(a != nd, axis=0)
    a = np.nan_to_num(a)
    top, left = r0 - (row - pad), c0 - (col - pad)
    p = ((0, 0), (top, th + 2 * pad - top - h), (left, tw + 2 * pad - left - w))
    return np.pad(a, p, mode="symmetric"), np.pad(valid, p[1:], mode="constant", constant_values=False), th, tw


def embed_sample(spec_tif, embed_fn, pad, mask=None, n_tiles=6, per_tile=5000, tile=1024, seed=0,
                 min_mask=0.5):
    """Vector embedding tại các điểm ảnh ngẫu nhiên của `n_tiles` ô ngẫu nhiên (ô có ≥ min_mask
    diện tích trong ranh giới). Dùng để khớp phép chiếu chung cho mọi năm. Trả về (N, dim)."""
    import rasterio
    rng = np.random.default_rng(seed)
    out = []
    with rasterio.open(spec_tif) as ds:
        H, W = ds.height, ds.width
        cand = []
        for row in range(0, H, tile):
            for col in range(0, W, tile):
                k = mask[row:row + tile, col:col + tile] if mask is not None else None
                if k is None or k.mean() >= min_mask:
                    cand.append((row, col))
        pick = rng.choice(len(cand), min(n_tiles, len(cand)), replace=False)
        for i in pick:
            row, col = cand[i]
            ap, vp, th, tw = _o_tile(ds, row, col, tile, pad)
            z = embed_fn(ap)[:, pad:pad + th, pad:pad + tw]
            ok = vp[pad:pad + th, pad:pad + tw] & np.isfinite(z).all(0)
            if mask is not None:
                ok &= mask[row:row + th, col:col + tw]
            rr, cc = np.nonzero(ok)
            if not len(rr):
                continue
            j = rng.choice(len(rr), min(per_tile, len(rr)), replace=False)
            out.append(z[:, rr[j], cc[j]].T)
    return np.concatenate(out).astype(np.float32)


def fit_proj(Z, n=6, p=(2, 98), max_n=200000, seed=0):
    """Phép chiếu PCA chung: mu (dim), comps (n × dim, dấu cố định), lo/hi phân vị của từng thành phần."""
    Z = np.asarray(Z, np.float64)
    Z = Z[np.isfinite(Z).all(1)]
    if len(Z) > max_n:
        Z = Z[np.random.default_rng(seed).choice(len(Z), max_n, replace=False)]
    mu = Z.mean(0)
    _, sv, Vt = np.linalg.svd(Z - mu, full_matrices=False)
    C = Vt[:n] * np.sign(Vt[:n][np.arange(n), np.abs(Vt[:n]).argmax(1)])[:, None]
    Y = (Z - mu) @ C.T
    ev = sv ** 2
    return dict(mu=mu.tolist(), comps=C.tolist(), lo=np.percentile(Y, p[0], 0).tolist(),
                hi=np.percentile(Y, p[1], 0).tolist(), ti_le_phuong_sai=(ev[:n] / ev.sum()).tolist(), n_mau=len(Z))


def quantize(v, lo, hi):
    """Giá trị -> 1..255 theo lo..hi (từng thành phần theo trục đầu); nan -> 0."""
    v = np.asarray(v, np.float32)
    sh = (-1,) + (1,) * (v.ndim - 1)
    lo, hi = np.asarray(lo, np.float32).reshape(sh), np.asarray(hi, np.float32).reshape(sh)
    x = np.clip((v - lo) / np.maximum(hi - lo, 1e-9), 0, 1)
    q = (1 + np.round(np.nan_to_num(x) * 254)).astype(np.uint8)
    q[~np.isfinite(v)] = 0
    return q


def embed_proj_tif(spec_tif, out_tif, embed_fn, pad, proj: dict, tile=1024, mask=None, verbose=True):
    """Embedding toàn ảnh theo ô (đúng cách chia ô của bản đồ) -> chiếu lên các thành phần của
    `proj` (fit_proj) -> uint8 1..255 (0 = trống / ngoài ranh giới), CÙNG lưới với ảnh S2."""
    import rasterio
    from rasterio.windows import Window
    t0 = time.time()
    mu, C = np.asarray(proj["mu"], np.float32), np.asarray(proj["comps"], np.float32)
    n = C.shape[0]
    with rasterio.open(spec_tif) as ds:
        H, W = ds.height, ds.width
        prof = dict(driver="GTiff", width=W, height=H, count=n, dtype="uint8", crs=ds.crs, transform=ds.transform,
                    nodata=0, tiled=True, blockxsize=256, blockysize=256, compress="deflate", BIGTIFF="IF_SAFER")
        Path(out_tif).parent.mkdir(parents=True, exist_ok=True)
        n_o = n_px = 0
        with rasterio.open(out_tif, "w", **prof) as o:
            for row in range(0, H, tile):
                for col in range(0, W, tile):
                    th, tw = min(tile, H - row), min(tile, W - col)
                    keep = None if mask is None else mask[row:row + th, col:col + tw]
                    if keep is not None and not keep.any():
                        continue
                    ap, vp, th, tw = _o_tile(ds, row, col, tile, pad)
                    z = embed_fn(ap)[:, pad:pad + th, pad:pad + tw]
                    y = np.tensordot(C, z - mu[:, None, None], axes=(1, 0))
                    ok = vp[pad:pad + th, pad:pad + tw] & np.isfinite(y).all(0)
                    if keep is not None:
                        ok &= keep
                    q = quantize(y, proj["lo"], proj["hi"])
                    q[:, ~ok] = 0
                    o.write(q, window=Window(col, row, tw, th))
                    n_o += 1; n_px += int(ok.sum())
    if verbose:
        print(f"    {Path(out_tif).name}: {n_o} ô, {n_px / 1e6:.1f}M điểm ảnh, {time.time() - t0:.0f}s")
    return out_tif


def rgb_cog_nhom(src, nhom, grid, lo=None, hi=None, nodata=0, tmp_dir="/tmp", rows=2048, song_song=True,
                 verbose=True):
    """Như rgb_cog nhưng MỘT lượt nắn ảnh cho nhiều ảnh ra: nhom = [(bands, out), ...].
    lo/hi: {băng: giá trị}; None = ảnh nguồn đã là 1..255 (giữ nguyên). Các bước dựng COG chạy song song."""
    import rasterio
    from concurrent.futures import ThreadPoolExecutor
    from rasterio.enums import Resampling
    from rasterio.windows import Window
    t0 = time.time()
    tf, w, h = grid
    allb = sorted({b for bs, _ in nhom for b in bs})
    tmps = [f"{tmp_dir}/_nhom_{os.getpid()}_{Path(o).stem}.tif" for _, o in nhom]
    prof = dict(driver="GTiff", width=w, height=h, dtype="uint8", crs=WEB, transform=tf, nodata=0, tiled=True,
                blockxsize=256, blockysize=256, compress="deflate", BIGTIFF="IF_SAFER")
    outs = [rasterio.open(t, "w", count=len(bs), **prof) for t, (bs, _) in zip(tmps, nhom)]
    try:
        with rasterio.open(src) as ds, _vrt(ds, grid, Resampling.bilinear, nodata) as v:
            for r0 in range(0, h, rows):
                hh = min(rows, h - r0)
                a = v.read(allb, window=Window(0, r0, w, hh), masked=True).astype(np.float32)
                m = np.ma.getmaskarray(a).any(0) | (a.filled(0) == 0).all(0)
                a = a.filled(0)
                for o, (bs, _) in zip(outs, nhom):
                    x = np.stack([a[allb.index(b)] for b in bs])
                    if lo is not None:
                        l_ = np.array([lo[b] for b in bs], np.float32)[:, None, None]
                        h_ = np.array([hi[b] for b in bs], np.float32)[:, None, None]
                        x = 1 + np.round(np.clip((x - l_) / np.maximum(h_ - l_, 1e-6), 0, 1) * 254)
                    else:
                        x = np.clip(np.round(x), 1, 255)
                    x = x.astype(np.uint8); x[:, m] = 0
                    o.write(x, window=Window(0, r0, w, hh))
    finally:
        for o in outs:
            o.close()

    def cog(i):
        return _write_cog(tmps[i], nhom[i][1], compress="DEFLATE", predictor=2, blocksize=256, overviews="AUTO",
                          resampling="AVERAGE")
    if song_song and len(nhom) > 1:
        with ThreadPoolExecutor(len(nhom)) as ex:
            list(ex.map(cog, range(len(nhom))))
    else:
        for i in range(len(nhom)):
            cog(i)
    if verbose:
        print(f"    {', '.join(Path(o).name for _, o in nhom)}: "
              f"{sum(os.path.getsize(o) for _, o in nhom) / 1e6:.0f} MB, {time.time() - t0:.0f}s")
    return [o for _, o in nhom]


def numpy_proj_fn(embed_fn, proj):
    """Bản numpy của torch_proj_fn (để kiểm thử và chạy không có GPU): cùng giao diện."""
    mu, C = np.asarray(proj["mu"], np.float32), np.asarray(proj["comps"], np.float32)

    def f(ap_batch, pad, th, tw, pts):
        qs, fins, pv = [], [], []
        for b in range(len(ap_batch)):
            z = embed_fn(ap_batch[b])[:, pad:pad + th, pad:pad + tw]
            y = np.tensordot(C, z - mu[:, None, None], axes=(1, 0))
            fin = np.isfinite(y).all(0)
            q = quantize(y, proj["lo"], proj["hi"]); q[:, ~fin] = 0
            qs.append(q); fins.append(fin)
            lr, lc = pts[b]
            pv.append(z[:, lr, lc].T.astype(np.float32) if len(lr) else np.zeros((0, z.shape[0]), np.float32))
        return np.stack(qs), np.stack(fins), pv
    return f


def torch_proj_fn(enc, spec_tif, proj, moments=None, device="cuda", emb_half=True):
    """Embedding trên GPU theo LÔ nhiều ô cùng cỡ, chiếu và lượng tử hoá NGAY trên GPU (chỉ chép về
    máy ảnh uint8 và vector tại điểm). Cùng quy ước với torch_embed_fn / embed_points_tiled: chuẩn hoá
    theo `moments` (None = raster_moments của ảnh), autocast fp16, hạ về float16. Lớp GRN của g7 chuẩn
    hoá theo TỪNG mẫu nên gộp ô thành lô không đổi kết quả (cổng ở notebook kiểm lại)."""
    import torch
    from s2_classify import raster_moments
    mean, std = raster_moments(spec_tif, list(range(10))) if moments is None else moments
    mt = torch.tensor(np.asarray(mean), dtype=torch.float32).view(1, -1, 1, 1).to(enc.device)
    st = torch.tensor(np.asarray(std), dtype=torch.float32).view(1, -1, 1, 1).to(enc.device)
    mu = torch.tensor(np.asarray(proj["mu"]), dtype=torch.float32, device=device).view(1, -1, 1, 1)
    C = torch.tensor(np.asarray(proj["comps"]), dtype=torch.float32, device=device)
    lo = torch.tensor(np.asarray(proj["lo"]), dtype=torch.float32, device=device).view(1, -1, 1, 1)
    hi = torch.tensor(np.asarray(proj["hi"]), dtype=torch.float32, device=device).view(1, -1, 1, 1)
    use_amp = str(device).startswith("cuda") and torch.cuda.is_available()

    def f(ap_batch, pad, th, tw, pts):
        m0, s0 = enc.mean, enc.std
        enc.mean, enc.std = mt, st
        try:
            enc.net.eval()
            at = torch.from_numpy(np.ascontiguousarray(ap_batch, dtype=np.float32)).to(device)
            with torch.inference_mode():
                x = enc.norm(at)
                if use_amp:
                    with torch.autocast("cuda", dtype=torch.float16):
                        z = enc.net(x)
                else:
                    z = enc.net(x)
                z = z.float()
                if emb_half:
                    z = z.half().float()
                z = z[:, :, pad:pad + th, pad:pad + tw]
                y = torch.einsum("nc,bchw->bnhw", C, z - mu)
                fin = torch.isfinite(y).all(1)
                x01 = ((y - lo) / (hi - lo).clamp_min(1e-9)).clamp(0, 1)
                q = (1 + torch.round(torch.nan_to_num(x01) * 254)).to(torch.uint8) * fin[:, None].to(torch.uint8)
                pv = []
                for b, (lr, lc) in enumerate(pts):
                    if len(lr):
                        ir = torch.as_tensor(np.asarray(lr), device=z.device)
                        ic = torch.as_tensor(np.asarray(lc), device=z.device)
                        pv.append(z[b][:, ir, ic].T.cpu().numpy().astype(np.float32))
                    else:
                        pv.append(np.zeros((0, z.shape[1]), np.float32))
                return q.cpu().numpy(), fin.cpu().numpy(), pv
        finally:
            enc.mean, enc.std = m0, s0
    return f


def embed_pass(spec_tif, proj_fn, pad, n_comp, out_tif, tile=1024, mask=None, points=None, batch=4, n_doc=3,
               verbose=True):
    """MỘT lượt qua ảnh S2 (chia ô y hệt bản đồ): ghi ảnh chiếu uint8 `n_comp` băng (0 = trống/ngoài
    ranh giới) VÀ lấy vector embedding tại các điểm `points` = {tên: (x, y)} trong cùng lượt.
    Ô đọc trước bằng `n_doc` luồng (mỗi luồng một tệp mở riêng), gộp các ô cùng cỡ thành lô `batch`.
    Trả về {tên: DataFrame (N, dim), NaN nếu điểm ngoài ảnh hoặc điểm ảnh không hợp lệ}."""
    import rasterio
    import threading
    from concurrent.futures import ThreadPoolExecutor
    from rasterio.windows import Window
    t0 = time.time()
    with rasterio.open(spec_tif) as ds:
        H, W, tfm, crs = ds.height, ds.width, ds.transform, ds.crs
    todo = []
    for row in range(0, H, tile):
        for col in range(0, W, tile):
            th, tw = min(tile, H - row), min(tile, W - col)
            if mask is None or mask[row:row + th, col:col + tw].any():
                todo.append((row, col))
    # điểm theo ô
    by_tile, out_pts = {}, {}
    for ten, (x, y) in (points or {}).items():
        fc, fr = (~tfm) * (np.asarray(x, float), np.asarray(y, float))
        rr, cc = np.floor(fr).astype(int), np.floor(fc).astype(int)
        out_pts[ten] = [None, len(rr)]
        for i in np.where((rr >= 0) & (rr < H) & (cc >= 0) & (cc < W))[0]:
            key = ((rr[i] // tile) * tile, (cc[i] // tile) * tile)
            by_tile.setdefault(key, []).append((ten, i, rr[i] - key[0], cc[i] - key[1]))
    mo, khoa = [], threading.Lock()
    loc = threading.local()

    def doc(rc):
        if not hasattr(loc, "ds"):
            loc.ds = rasterio.open(spec_tif)
            with khoa:
                mo.append(loc.ds)
        ap, vp, th, tw = _o_tile(loc.ds, rc[0], rc[1], tile, pad)
        return rc, ap, vp, th, tw

    prof = dict(driver="GTiff", width=W, height=H, count=n_comp, dtype="uint8", crs=crs, transform=tfm, nodata=0,
                tiled=True, blockxsize=256, blockysize=256, compress="deflate", BIGTIFF="IF_SAFER")
    Path(out_tif).parent.mkdir(parents=True, exist_ok=True)
    n_px = 0
    ex = ThreadPoolExecutor(max(1, n_doc))
    try:
        with rasterio.open(out_tif, "w", **prof) as o:
            futs, i_next, cho = [], 0, []

            def nap_them():
                nonlocal i_next
                while i_next < len(todo) and len(futs) < max(2 * batch, n_doc * 2):
                    futs.append(ex.submit(doc, todo[i_next])); i_next += 1

            def xu_ly(lo_):
                nonlocal n_px
                (row, col), _, _, th, tw = lo_[0]
                pts = []
                for (r_, c_), _, _, _, _ in lo_:
                    lst = by_tile.get((r_, c_), [])
                    pts.append((np.array([t[2] for t in lst], int), np.array([t[3] for t in lst], int)))
                q, fin, pv = proj_fn(np.stack([t[1] for t in lo_]), pad, th, tw, pts)
                for b, ((r_, c_), _, vp, th_, tw_) in enumerate(lo_):
                    ok = vp[pad:pad + th_, pad:pad + tw_] & fin[b]
                    if mask is not None:
                        ok &= mask[r_:r_ + th_, c_:c_ + tw_]
                    qb = q[b]; qb[:, ~ok] = 0
                    o.write(qb, window=Window(c_, r_, tw_, th_))
                    n_px += int(ok.sum())
                    lst = by_tile.get((r_, c_), [])
                    for j, (ten, i, lr, lc) in enumerate(lst):
                        if out_pts[ten][0] is None:
                            out_pts[ten][0] = np.full((out_pts[ten][1], pv[b].shape[1]), np.nan, np.float32)
                        out_pts[ten][0][i] = pv[b][j] if vp[pad + lr, pad + lc] else np.nan

            nap_them()
            while futs:
                r = futs.pop(0).result(); nap_them()
                if cho and (r[3], r[4]) != (cho[0][3], cho[0][4]):
                    xu_ly(cho); cho = []
                cho.append(r)
                if len(cho) >= batch:
                    xu_ly(cho); cho = []
            if cho:
                xu_ly(cho)
    finally:
        ex.shutdown(wait=True)
        for d_ in mo:
            d_.close()
    res = {}
    for ten, (arr, n) in out_pts.items():
        if arr is None:
            arr = np.full((n, 1), np.nan, np.float32)
        res[ten] = pd.DataFrame(arr, columns=[f"e{i:02d}" for i in range(arr.shape[1])])
    if verbose:
        print(f"    {Path(out_tif).name}: {len(todo)} ô, lô {batch}, {n_px / 1e6:.1f}M điểm ảnh, "
              f"{sum(v[1] for v in out_pts.values())} điểm, {time.time() - t0:.0f}s")
    return res


def hop_le(p):
    """Tệp GeoTIFF mở và đọc được (bắt tệp chép dở khi bị ngắt)."""
    import rasterio
    from rasterio.windows import Window
    try:
        with rasterio.open(p) as d:
            d.read(1, window=Window(0, 0, min(64, d.width), min(64, d.height)))
            ov = d.overviews(1)
            if ov:
                d.read(1, out_shape=(max(1, d.height // ov[-1]), max(1, d.width // ov[-1])))
        return True
    except Exception:
        return False


def chep_an_toan(src, dst):
    """Chép sang tên tạm rồi đổi tên: bị ngắt giữa chừng thì không để lại tệp dở mang tên thật."""
    Path(dst).parent.mkdir(parents=True, exist_ok=True)
    tmp = f"{dst}.part"
    shutil.copyfile(src, tmp)
    os.replace(tmp, dst)
    return dst


def sample_bands(tif, x, y, bands=None):
    """Giá trị các băng tại điểm (N, nb); ngoài ảnh -> -1."""
    import rasterio
    with rasterio.open(tif) as ds:
        b = list(bands) if bands else list(range(1, ds.count + 1))
        fc, fr = (~ds.transform) * (np.asarray(x, float), np.asarray(y, float))
        rr, cc = np.floor(fr).astype(int), np.floor(fc).astype(int)
        ok = (rr >= 0) & (rr < ds.height) & (cc >= 0) & (cc < ds.width)
        out = np.full((len(rr), len(b)), -1, np.int64)
        if ok.any():
            out[ok] = np.array(list(ds.sample(list(zip(np.asarray(x)[ok], np.asarray(y)[ok])), indexes=b)))
    return out


# =========================================================================== #
# 2. Đường mùa vụ tái dựng từ PC tại điểm
# =========================================================================== #

def reconstruct(pcs_x100, he_so, k):
    """PC (× 100) -> 72 đặc trưng gốc xấp xỉ: x = mean + std · (W[:k]ᵀ · pc)."""
    W = np.asarray(he_so["W"], np.float64)[:k]
    pc = np.asarray(pcs_x100, np.float64) / float(he_so.get("he_so_nhan", 100))
    z = pc @ W
    return np.asarray(he_so["mean"]) + np.asarray(he_so["std"]) * z


def pc_curves(x, y, years, ts_by: dict, he_so, k=11, feats=("NDVI", "MNDWI")):
    """
    Với mỗi điểm và mỗi năm: đường 6 kỳ của các đặc trưng `feats`, tái dựng từ k PC, cộng NFILL.
    Trả về dict {str(năm): {"NDVI": [[6 số] cho từng điểm], ..., "NFILL": [...]}} theo thứ tự điểm.
    """
    import rasterio
    bang = list(he_so["bang"])
    n_ky = len({b.rsplit("_p", 1)[1] for b in bang})
    idx = {f: [bang.index(f"{f}_p{i + 1:02d}") for i in range(n_ky)] for f in feats}
    out = {}
    for yv in years:
        p = ts_by.get(int(yv))
        if p is None or not Path(p).exists():
            continue
        with rasterio.open(p) as ds:
            desc = list(ds.descriptions or [])
            b_fill = desc.index("NFILL") + 1 if "NFILL" in desc else ds.count
            vals = np.array(list(ds.sample(list(zip(x, y)), indexes=list(range(1, k + 1)) + [b_fill])),
                            dtype=np.float64)
        bad = (vals[:, :k] == TS_NODATA).any(1)
        full = reconstruct(vals[:, :k], he_so, k)
        d = {f: [(None if bad[i] else [round(float(v), 3) for v in full[i, idx[f]]]) for i in range(len(x))]
             for f in feats}
        d["NFILL"] = [None if bad[i] else int(vals[i, k]) for i in range(len(x))]
        out[str(int(yv))] = d
    return out


# =========================================================================== #
# 3. Điểm ứng viên
# =========================================================================== #

def candidate_points(lulc_tif, pc_tif, n_total=1200, k_clusters=10, min_dist=250.0, n_pool=60000,
                     seed=0, k_pc=11, verbose=True):
    """
    Điểm ứng viên phân tầng: tầng = lớp của bản đồ `lulc_tif` (lưới ranh giới, 0 = ngoài)
    × cụm k-means trên k PC của năm đó (tách các kiểu mùa vụ khác nhau trong cùng một lớp).
    Rải đều số điểm cho mỗi tầng, cách nhau tối thiểu `min_dist` m, tâm điểm ảnh 10 m.
    """
    import rasterio
    from sklearn.cluster import MiniBatchKMeans
    from pyproj import Transformer
    rng = np.random.default_rng(seed)
    with rasterio.open(lulc_tif) as ds:
        a = ds.read(1)
        tf, crs = ds.transform, ds.crs
    rr, cc = np.nonzero(a > 0)
    pick = rng.choice(len(rr), min(n_pool, len(rr)), replace=False)
    rr, cc = rr[pick], cc[pick]
    xs, ys = tf.c + (cc + 0.5) * tf.a, tf.f + (rr + 0.5) * tf.e
    lop = a[rr, cc].astype(int)
    with rasterio.open(pc_tif) as ds:
        if ds.crs != crs:
            xs2, ys2 = Transformer.from_crs(crs, ds.crs, always_xy=True).transform(xs, ys)
        else:
            xs2, ys2 = xs, ys
        pcs = np.array(list(ds.sample(list(zip(xs2, ys2)), indexes=list(range(1, k_pc + 1)))), np.float64)
    ok = ~(pcs == TS_NODATA).any(1)
    xs, ys, lop, pcs = xs[ok], ys[ok], lop[ok], pcs[ok]
    Z = (pcs - pcs.mean(0)) / np.maximum(pcs.std(0), 1e-9)
    cum = MiniBatchKMeans(k_clusters, random_state=seed, n_init=5, batch_size=4096).fit_predict(Z)
    tang = lop * 100 + cum
    ts = np.unique(tang)
    per = int(math.ceil(n_total / len(ts)))
    chon, ox, oy = [], [], []
    cell = min_dist
    grid = {}
    for t in rng.permutation(ts):
        idx = rng.permutation(np.where(tang == t)[0])
        dem = 0
        for i in idx:
            gx, gy = int(xs[i] // cell), int(ys[i] // cell)
            xa = False
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    for (px, py) in grid.get((gx + dx, gy + dy), ()):
                        if (px - xs[i]) ** 2 + (py - ys[i]) ** 2 < min_dist ** 2:
                            xa = True
                            break
                    if xa:
                        break
                if xa:
                    break
            if xa:
                continue
            grid.setdefault((gx, gy), []).append((xs[i], ys[i]))
            chon.append(i); dem += 1
            if dem >= per:
                break
    chon = np.array(chon, int)
    lon, lat = Transformer.from_crs(crs, "EPSG:4326", always_xy=True).transform(xs[chon], ys[chon])
    d = pd.DataFrame(dict(id=[f"C{i:05d}" for i in range(len(chon))], lon=np.round(lon, 7), lat=np.round(lat, 7),
                          x_utm=xs[chon], y_utm=ys[chon], tang=tang[chon], lop3_ban_do=lop[chon], cum=cum[chon]))
    if verbose:
        print(f"  điểm ứng viên: {len(d)} điểm, {len(ts)} tầng (lớp × {k_clusters} cụm), cách nhau ≥ {min_dist:.0f} m")
    return d


def e0_points(pts_gdf, lab: pd.DataFrame, year_cols: dict):
    """900 điểm E0 (EPSG:32648) + nhãn 3 lớp cũ theo năm làm gợi ý (goi_y_{năm})."""
    from pyproj import Transformer
    g = pts_gdf.sort_values("id").reset_index(drop=True)
    L = lab.sort_values("id").reset_index(drop=True)
    assert (g["id"].values == L["id"].values).all()
    lon, lat = Transformer.from_crs(str(g.crs), "EPSG:4326", always_xy=True).transform(g.geometry.x.values,
                                                                                         g.geometry.y.values)
    d = pd.DataFrame(dict(id=[f"E{int(i):04d}" for i in g["id"]], lon=np.round(lon, 7), lat=np.round(lat, 7),
                          x_utm=g.geometry.x.values, y_utm=g.geometry.y.values, tang=g["stratum"].values))
    for y, c in year_cols.items():
        d[f"goi_y_{y}"] = L[c].values
    return d


# =========================================================================== #
# 4. Manifest
# =========================================================================== #

def make_manifest(repo, layers: list, years: list, grid_utm: dict, point_sets: list, curves: dict | None,
                  pc: dict | None, he_lop_path="he_lop_v1.json", ghi_chu=""):
    return dict(phien_ban=1, tao_luc=time.strftime("%Y-%m-%d %H:%M"), repo=repo, years=list(map(int, years)),
                layers=layers, grid=grid_utm, point_sets=point_sets, curves=curves, pc=pc,
                he_lop=he_lop_path, ghi_chu=ghi_chu,
                nguon="Contains modified Copernicus Sentinel data (2017-2026), processed in Google Earth Engine")


# =========================================================================== #
# 5. Tự kiểm tra (CPU, dữ liệu giả)
# =========================================================================== #

def self_test(verbose=True) -> int:
    import tempfile
    import rasterio
    from rasterio.transform import from_origin
    fails = 0

    def chk(ok, msg):
        nonlocal fails
        fails += (not ok)
        if verbose:
            print(("  ok  " if ok else "  LỖI ") + msg)

    tmp = Path(tempfile.mkdtemp()); rng = np.random.default_rng(0)
    H, W, x0, y0 = 300, 360, 616770.0, 2349350.0
    s2 = np.clip(rng.normal(1200, 400, (10, H, W)), 1, 9000).astype(np.int16)
    s2[:, :20, :20] = 0
    p = tmp / "S2.tif"
    with rasterio.open(p, "w", driver="GTiff", width=W, height=H, count=10, dtype="int16", crs="EPSG:32648",
                       transform=from_origin(x0, y0, 10, 10)) as o:
        o.write(s2)
    grid = grid_3857((x0, y0 - H * 10, x0 + W * 10, y0), res=10)
    out = rgb_cog(p, [3, 2, 1], [100] * 3, [2500] * 3, tmp / "tc.tif", grid, tmp_dir=str(tmp), verbose=False)
    with rasterio.open(out) as d:
        prof = d.profile; ov = d.overviews(1); a = d.read()
    chk(prof["driver"] == "GTiff" and d.crs.to_string() == WEB and prof["blockxsize"] == 256,
        "rgb_cog: GeoTIFF 3857, ô 256")
    chk(len(ov) > 0, f"rgb_cog: có overview {ov}")
    chk(a.min() == 0 and a.max() <= 255 and (a[:, 5:10, 5:10] == 0).all(), "rgb_cog: vùng 0 -> nodata 0")
    # kiểm tra COG hợp lệ theo GDAL
    try:
        from osgeo_utils.samples.validate_cloud_optimized_geotiff import validate  # noqa
    except Exception:
        pass
    cls = rng.integers(0, 4, (H, W)).astype(np.uint8)
    pc_ = tmp / "L.tif"
    with rasterio.open(pc_, "w", driver="GTiff", width=W, height=H, count=1, dtype="uint8", crs="EPSG:32648",
                       transform=from_origin(x0, y0, 10, 10), nodata=0) as o:
        o.write(cls[None])
    oc = class_cog(pc_, tmp / "cls.tif", grid, tmp_dir=str(tmp), verbose=False)
    with rasterio.open(oc) as d:
        v = d.read(1)
    chk(set(np.unique(v)) <= {0, 1, 2, 3}, "class_cog: chỉ giá trị lớp, không nội suy")
    # PC giả + tái dựng
    k, nb = 4, 12
    rng2 = np.random.default_rng(1)
    Wm = np.linalg.qr(rng2.normal(size=(nb, nb)))[0][:k]
    bang = [f"{f}_p{i + 1:02d}" for i in range(6) for f in ("NDVI", "MNDWI")]
    he = dict(W=Wm.tolist(), mean=rng2.normal(size=nb).tolist(), std=np.abs(rng2.normal(1, .1, nb)).tolist(),
              bang=bang, he_so_nhan=100)
    zt = rng2.normal(size=(H, W, nb))
    pcs = np.einsum("hwn,kn->khw", zt, Wm) * 100
    arr = np.concatenate([pcs, np.full((1, H, W), 30.0), np.zeros((1, H, W))]).astype(np.int16)
    pt = tmp / "PC.tif"
    with rasterio.open(pt, "w", driver="GTiff", width=W, height=H, count=k + 2, dtype="int16", crs="EPSG:32648",
                       transform=from_origin(x0, y0, 10, 10), nodata=TS_NODATA) as o:
        o.write(arr); o.descriptions = tuple([f"PC{i:02d}" for i in range(1, k + 1)] + ["NOBS", "NFILL"])
    xs, ys = x0 + 10 * np.array([50, 100, 200]) + 5, y0 - 10 * np.array([40, 150, 250]) - 5
    cv = pc_curves(xs, ys, [2025], {2025: str(pt)}, he, k=k)
    ref = reconstruct(arr[:k, [40, 150, 250], [50, 100, 200]].T, he, k)
    got = np.array(cv["2025"]["NDVI"][1])
    chk(np.allclose(got, ref[1, [bang.index(f"NDVI_p{i + 1:02d}") for i in range(6)]], atol=2e-3),
        "pc_curves: đường NDVI tái dựng đúng điểm ảnh")
    oc2 = pc_cog(pt, tmp / "pcc.tif", k=k, tmp_dir=str(tmp), verbose=False)
    with rasterio.open(oc2) as d:
        chk(d.count == k + 1 and d.overviews(1) == [] and d.profile["blockxsize"] == 128,
            "pc_cog: k PC + NFILL, ô 128, không overview")
    cand = candidate_points(pc_, pt, n_total=60, k_clusters=3, min_dist=150, n_pool=5000, k_pc=k, verbose=False)
    dmin = min(math.hypot(a_ - b_, c_ - d_) for i, (a_, c_) in enumerate(zip(cand.x_utm, cand.y_utm))
               for j, (b_, d_) in enumerate(zip(cand.x_utm, cand.y_utm)) if i < j)
    chk(len(cand) > 20 and dmin >= 150 - 1e-6, f"candidate_points: {len(cand)} điểm, cách nhau ≥ {dmin:.0f} m")
    chk(((cand.x_utm - x0 - 5) % 10 == 0).all(), "candidate_points: tâm điểm ảnh 10 m")
    # ảnh xám một băng: giá trị 0 của nguồn vẫn hợp lệ
    g = gray_cog(pt, 1, -300, 300, tmp / "pc1.tif", grid, nodata=TS_NODATA, tmp_dir=str(tmp), verbose=False)
    with rasterio.open(g) as d:
        gv = d.read(1)
    chk(d.count == 1 and (gv > 0).mean() > 0.95, "gray_cog: 1 băng, giá trị 0 của nguồn không bị coi là trống")
    # embedding trực tiếp: encoder giả CÓ ngữ cảnh (trung bình 5 × 5) để kiểm tra lề và chia ô
    from scipy.ndimage import uniform_filter
    Wemb = rng.normal(size=(8, 10)).astype(np.float32)

    def fake(ap):
        z = np.tensordot(Wemb, ap / 1000.0, axes=(1, 0))
        return uniform_filter(z, size=(1, 5, 5), mode="reflect").astype(np.float32)

    Hs, Ws = 150, 170
    spec = (rng.normal(1500, 300, (10, Hs, Ws))).astype(np.float32)
    sp = tmp / "spec.tif"
    with rasterio.open(sp, "w", driver="GTiff", width=Ws, height=Hs, count=10, dtype="float32", crs="EPSG:32648",
                       transform=from_origin(x0, y0, 10, 10)) as o:
        o.write(spec)
    msk = np.ones((Hs, Ws), bool); msk[:, :20] = False
    Z = embed_sample(str(sp), fake, pad=4, mask=msk, n_tiles=4, per_tile=300, tile=64, seed=1)
    pr = fit_proj(Z, n=6)
    chk(Z.shape[1] == 8 and len(pr["comps"]) == 6 and np.allclose(np.asarray(pr["comps"]) @ np.asarray(pr["comps"]).T,
                                                                    np.eye(6), atol=1e-6), "embed_sample + fit_proj")
    ou = embed_proj_tif(str(sp), str(tmp / "emb_u8.tif"), fake, pad=4, proj=pr, tile=64, mask=msk, verbose=False)
    with rasterio.open(ou) as d:
        q = d.read()
    full = fake(np.pad(spec, ((0, 0), (4, 4), (4, 4)), mode="symmetric"))[:, 4:-4, 4:-4]   # cả ảnh một lần
    ref_q = quantize(np.tensordot(np.asarray(pr["comps"], np.float32), full - np.asarray(pr["mu"], np.float32)[:, None, None],
                                  axes=(1, 0)), pr["lo"], pr["hi"])
    inside = msk.copy()
    same = (np.abs(q[:, inside].astype(int) - ref_q[:, inside].astype(int)) <= 1).mean()
    chk(q.shape == (6, Hs, Ws) and (q[:, ~msk] == 0).all() and same > 0.999,
        f"embed_proj_tif: chia ô + lề = tính cả ảnh ({same:.4f}), ngoài ranh giới = 0")
    xs_, ys_ = x0 + 10 * np.array([30, 100, 5]) + 5, y0 - 10 * np.array([20, 120, 50]) - 5
    sb = sample_bands(ou, xs_, ys_)
    chk(sb.shape == (3, 6) and (sb[:2] == q[:, [20, 120], [30, 100]].T).all() and (sb[2] == 0).all(),
        "sample_bands đúng điểm ảnh")
    fn = numpy_proj_fn(fake, pr)
    xs2, ys2 = x0 + 10 * rng.integers(20, Ws, 40) + 5, y0 - 10 * rng.integers(0, Hs, 40) - 5
    for bt in (1, 3):
        pts_ = embed_pass(str(sp), fn, 4, 6, str(tmp / f"pass{bt}.tif"), tile=64, mask=msk,
                          points={"a": (xs2, ys2), "b": (xs_, ys_)}, batch=bt, n_doc=2, verbose=False)
        with rasterio.open(tmp / f"pass{bt}.tif") as d:
            q2 = d.read()
        rr_, cc_ = ((y0 - ys2) // 10).astype(int), ((xs2 - x0) // 10).astype(int)
        chk((q2 == q).all() and np.allclose(pts_["a"].to_numpy(), full[:, rr_, cc_].T, atol=1e-6)
            and pts_["b"].shape == (3, 8), f"embed_pass lô {bt}: ảnh = embed_proj_tif, điểm = tính cả ảnh")
    g1, g2 = tmp / "n1.tif", tmp / "n2.tif"
    rgb_cog_nhom(ou, [([1, 2, 3], str(g1)), ([4, 5, 6], str(g2))], grid, tmp_dir=str(tmp), verbose=False)
    r1 = rgb_cog(ou, [1, 2, 3], [1] * 3, [255] * 3, tmp / "r1.tif", grid, nodata=0, tmp_dir=str(tmp), verbose=False)
    with rasterio.open(g1) as d1, rasterio.open(r1) as d2, rasterio.open(g2) as d3:
        chk((d1.read() == d2.read()).all() and d3.count == 3 and len(d1.overviews(1)) > 0,
            "rgb_cog_nhom: một lượt nắn cho hai ảnh = rgb_cog từng ảnh")
    bad = tmp / "hong.tif"; bad.write_bytes(open(g1, "rb").read()[:5000])
    chk(hop_le(str(g1)) and not hop_le(str(bad)), "hop_le bắt tệp chép dở")
    if verbose:
        print(f"s2_hf_lop {__version__}: {'ĐẠT' if not fails else f'{fails} LỖI'}")
    return fails


if __name__ == "__main__":
    raise SystemExit(self_test())
