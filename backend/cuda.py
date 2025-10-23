#!/usr/bin/env python3
"""
Basic CUDA Availability Checker
"""

import sys

def check_cuda_basic():
    """Basic CUDA availability check"""
    print("=" * 50)
    print("CUDA AVAILABILITY CHECK")
    print("=" * 50)
    
    try:
        import torch
        cuda_available = torch.cuda.is_available()
        print(f"✓ PyTorch CUDA available: {cuda_available}")
        
        if cuda_available:
            print(f"✓ Current device: {torch.cuda.current_device()}")
            print(f"✓ Device name: {torch.cuda.get_device_name()}")
            print(f"✓ CUDA version: {torch.version.cuda}")
        else:
            print("✗ CUDA not available via PyTorch")
            
    except ImportError:
        print("✗ PyTorch not installed")
    
    print("-" * 50)
    
    try:
        import tensorflow as tf
        gpu_available = tf.test.is_gpu_available()
        print(f"✓ TensorFlow GPU available: {gpu_available}")
        
        if gpu_available:
            gpus = tf.config.list_physical_devices('GPU')
            print(f"✓ TensorFlow GPU devices: {len(gpus)}")
            for gpu in gpus:
                print(f"  - {gpu}")
                
    except ImportError:
        print("✗ TensorFlow not installed")

if __name__ == "__main__":
    check_cuda_basic()

    