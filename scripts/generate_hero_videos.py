#!/usr/bin/env python3
"""
Pipeline de generación y transcodificación de video hero cinematográfico
para Talentus Scout (TS-24).
Genera hero-soccer-loop.mp4 y hero-soccer-loop.webm a partir del fotograma maestro
creando una animación cinemática fluida en bucle continuo (seamless loop).
"""
import os
import math
import subprocess
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import imageio_ffmpeg

def main():
    master_frame_path = "/home/edgar/.gemini/antigravity-ide/brain/bdf49b10-aa1a-4e8a-818d-9034cf138c4e/hero_soccer_frame_1791670397728.jpg"
    out_dir = "/home/edgar/Talentus Scout/talentus-scout-fe/public/assets/videos"
    os.makedirs(out_dir, exist_ok=True)
    
    mp4_path = os.path.join(out_dir, "hero-soccer-loop.mp4")
    webm_path = os.path.join(out_dir, "hero-soccer-loop.webm")
    
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    print(f"Usando FFmpeg: {ffmpeg_exe}")
    
    # Cargar imagen maestra original
    base_img = Image.open(master_frame_path).convert("RGB")
    orig_w, orig_h = base_img.size
    print(f"Dimensiones de imagen maestra: {orig_w}x{orig_h}")
    
    # Parámetros de animación
    fps = 30
    duration_sec = 5.0
    total_frames = int(fps * duration_sec) # 150 frames
    out_w, out_h = 1920, 1080
    
    # Directorio temporal de frames
    temp_frames_dir = "/home/edgar/.gemini/antigravity-ide/brain/bdf49b10-aa1a-4e8a-818d-9034cf138c4e/scratch/hero_frames"
    os.makedirs(temp_frames_dir, exist_ok=True)
    
    print(f"Generando {total_frames} fotogramas cinemáticos en bucle ({fps} fps, {duration_sec}s)...")
    
    for i in range(total_frames):
        # Progreso cíclico t de 0 a 1 usando función seno para loop perfecto (ping-pong suave)
        # sin saltos al reiniciar el video
        cycle = (math.sin((i / total_frames) * 2 * math.pi - math.pi / 2) + 1.0) / 2.0
        
        # 1. Movimiento de cámara suave (zoom sutil del 100% al 104% y leve paneo dinámico)
        scale = 1.0 + 0.04 * cycle
        crop_w = int(orig_w / scale)
        crop_h = int(orig_h / scale)
        
        # Paneo ligero hacia la zona de contacto del botín con el balón
        offset_x = int((orig_w - crop_w) * (0.5 + 0.15 * cycle))
        offset_y = int((orig_h - crop_h) * (0.5 + 0.10 * cycle))
        
        box = (offset_x, offset_y, offset_x + crop_w, offset_y + crop_h)
        cropped = base_img.crop(box).resize((out_w, out_h), Image.Resampling.BICUBIC)
        
        # 2. Pulsación sutil de iluminación dorada y contraste atmosférico (golden hour stadium pulse)
        enhancer_brightness = ImageEnhance.Brightness(cropped)
        # Brillo varía sutilmente entre 1.00 y 1.06
        frame_img = enhancer_brightness.enhance(1.0 + 0.05 * math.sin(cycle * math.pi))
        
        # Contraste sutil
        enhancer_contrast = ImageEnhance.Contrast(frame_img)
        frame_img = enhancer_contrast.enhance(1.0 + 0.03 * cycle)
        
        frame_file = os.path.join(temp_frames_dir, f"frame_{i:04d}.jpg")
        frame_img.save(frame_file, "JPEG", quality=92)
        
        if (i + 1) % 30 == 0 or i == total_frames - 1:
            print(f"  Fotogramas renderizados: {i + 1}/{total_frames}")
            
    print("Renderizado de fotogramas completado.")
    
    # 3. Transcodificar a MP4 con H.264, yuv420p y +faststart
    print(f"Transcodificando MP4 optimizado para web: {mp4_path}...")
    mp4_cmd = [
        ffmpeg_exe, "-y",
        "-r", str(fps),
        "-i", os.path.join(temp_frames_dir, "frame_%04d.jpg"),
        "-c:v", "libx264",
        "-preset", "slow",
        "-profile:v", "high",
        "-level", "4.1",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        mp4_path
    ]
    subprocess.run(mp4_cmd, check=True)
    mp4_size_mb = os.path.getsize(mp4_path) / (1024 * 1024)
    print(f"hero-soccer-loop.mp4 generado exitosamente: {mp4_size_mb:.2f} MB")
    
    # 4. Transcodificar a WebM con VP9 para navegadores modernos
    print(f"Transcodificando WebM optimizado para web: {webm_path}...")
    webm_cmd = [
        ffmpeg_exe, "-y",
        "-r", str(fps),
        "-i", os.path.join(temp_frames_dir, "frame_%04d.jpg"),
        "-c:v", "libvpx-vp9",
        "-crf", "28",
        "-b:v", "1500k",
        "-pix_fmt", "yuv420p",
        webm_path
    ]
    subprocess.run(webm_cmd, check=True)
    webm_size_mb = os.path.getsize(webm_path) / (1024 * 1024)
    print(f"hero-soccer-loop.webm generado exitosamente: {webm_size_mb:.2f} MB")
    
    # Limpieza de frames temporales
    for f in os.listdir(temp_frames_dir):
        os.remove(os.path.join(temp_frames_dir, f))
    os.rmdir(temp_frames_dir)
    print("Limpieza de fotogramas temporales completada.")
    print("Pipeline de video completado con éxito.")

if __name__ == "__main__":
    main()
