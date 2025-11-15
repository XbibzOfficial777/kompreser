/**
 * Kompreser Interactive Demo
 * Advanced image compression showcase
 */

// Global variables
let selectedFiles = [];
let kompreser = null;
let compressionResults = [];

// Initialize the demo
document.addEventListener('DOMContentLoaded', function() {
    initializeDemo();
    setupEventListeners();
});

async function initializeDemo() {
    try {
        // Initialize Kompreser
        kompreser = new Kompreser({
            quality: 0.8,
            format: 'auto',
            progressive: true,
            useWorkers: true,
            maxWorkers: 4,
            enablePerformanceTracking: true,
            logLevel: 'INFO'
        });

        console.log('Kompreser initialized successfully');
        
        // Enable compress button
        document.getElementById('compressBtn').disabled = false;
        
    } catch (error) {
        console.error('Failed to initialize Kompreser:', error);
        showNotification('Failed to initialize compression library', 'error');
    }
}

function setupEventListeners() {
    // File input change
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    
    // Quality slider
    const qualitySlider = document.getElementById('qualitySlider');
    qualitySlider.addEventListener('input', function() {
        document.getElementById('qualityValue').textContent = this.value;
    });
    
    // Drop zone
    const dropZone = document.getElementById('dropZone');
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('drop', handleDrop);
    
    // Format select
    document.getElementById('formatSelect').addEventListener('change', updateCompressionOptions);
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    selectedFiles = files;
    
    if (files.length > 0) {
        displaySelectedFiles(files);
        document.getElementById('compressBtn').disabled = false;
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const files = Array.from(event.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    selectedFiles = files;
    
    if (files.length > 0) {
        displaySelectedFiles(files);
        document.getElementById('compressBtn').disabled = false;
    } else {
        showNotification('Please drop image files only', 'warning');
    }
}

function displaySelectedFiles(files) {
    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.innerHTML = `
        <div class="text-center text-white">
            <i class="fas fa-images text-4xl mb-4 opacity-70"></i>
            <h4 class="text-lg font-semibold mb-2">${files.length} file(s) selected</h4>
            <p class="opacity-70">Ready for compression</p>
            <div class="mt-4 space-y-2">
                ${files.map(file => `
                    <div class="bg-white bg-opacity-10 rounded-lg p-2 text-sm">
                        ${file.name} (${formatBytes(file.size)})
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function compressImages() {
    if (!kompreser || selectedFiles.length === 0) {
        showNotification('Please select files first', 'warning');
        return;
    }

    const compressBtn = document.getElementById('compressBtn');
    const originalText = compressBtn.innerHTML;
    
    // Disable button and show loading
    compressBtn.disabled = true;
    compressBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Compressing...';
    
    try {
        // Get compression options
        const options = getCompressionOptions();
        
        // Start timing
        const startTime = performance.now();
        
        // Compress images
        const results = await kompreser.compressBatch(selectedFiles, options);
        
        // Calculate timing
        const endTime = performance.now();
        const totalTime = Math.round(endTime - startTime);
        
        // Store results
        compressionResults = results;
        
        // Display results
        displayCompressionResults(results, totalTime);
        
        // Update overall statistics
        updateOverallStats(results, totalTime);
        
        showNotification(`Successfully compressed ${results.filter(r => r.success).length} images!`, 'success');
        
    } catch (error) {
        console.error('Compression failed:', error);
        showNotification('Compression failed: ' + error.message, 'error');
    } finally {
        // Restore button
        compressBtn.disabled = false;
        compressBtn.innerHTML = originalText;
    }
}

function getCompressionOptions() {
    return {
        quality: parseFloat(document.getElementById('qualitySlider').value),
        format: document.getElementById('formatSelect').value,
        progressive: document.getElementById('progressiveCheck').checked,
        useWorkers: document.getElementById('workersCheck').checked
    };
}

function updateCompressionOptions() {
    // Update options based on format selection
    const format = document.getElementById('formatSelect').value;
    const progressiveCheck = document.getElementById('progressiveCheck');
    
    if (format === 'jpeg') {
        progressiveCheck.disabled = false;
        progressiveCheck.parentElement.style.opacity = '1';
    } else {
        progressiveCheck.disabled = true;
        progressiveCheck.parentElement.style.opacity = '0.5';
        if (format !== 'auto') {
            progressiveCheck.checked = false;
        }
    }
}

function displayCompressionResults(results, totalTime) {
    const container = document.getElementById('resultsContainer');
    
    container.innerHTML = results.map((result, index) => {
        if (result.success) {
            const compressionRatio = Math.round(result.compressionRatio * 100);
            const sizeReduction = result.originalSize - result.compressedSize;
            
            return `
                <div class="result-card rounded-lg p-4">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="font-semibold text-gray-800 truncate">
                            ${selectedFiles[index].name}
                        </h4>
                        <span class="px-3 py-1 bg-green-500 text-white text-xs rounded-full">
                            ${compressionRatio}% reduction
                        </span>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                            <span class="text-gray-600">Original:</span>
                            <span class="font-semibold ml-2">${formatBytes(result.originalSize)}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Compressed:</span>
                            <span class="font-semibold ml-2">${formatBytes(result.compressedSize)}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Format:</span>
                            <span class="font-semibold ml-2">${result.format.toUpperCase()}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Time:</span>
                            <span class="font-semibold ml-2">${result.processingTime}ms</span>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <div class="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Compression Progress</span>
                            <span>${compressionRatio}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="progress-bar rounded-full h-2" style="width: ${compressionRatio}%"></div>
                        </div>
                    </div>
                    
                    <div class="flex space-x-2">
                        <button onclick="downloadResult(${index})" class="flex-1 bg-blue-500 text-white py-2 px-4 rounded text-sm hover:bg-blue-600 transition-colors">
                            <i class="fas fa-download mr-1"></i>Download
                        </button>
                        <button onclick="previewResult(${index})" class="flex-1 bg-gray-500 text-white py-2 px-4 rounded text-sm hover:bg-gray-600 transition-colors">
                            <i class="fas fa-eye mr-1"></i>Preview
                        </button>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="result-card rounded-lg p-4 border-l-red-500">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="font-semibold text-gray-800 truncate">
                            ${selectedFiles[index].name}
                        </h4>
                        <span class="px-3 py-1 bg-red-500 text-white text-xs rounded-full">
                            Failed
                        </span>
                    </div>
                    <p class="text-red-600 text-sm">${result.error || 'Compression failed'}</p>
                </div>
            `;
        }
    }).join('');
}

function updateOverallStats(results, totalTime) {
    const successfulResults = results.filter(r => r.success);
    
    if (successfulResults.length === 0) return;
    
    const totalOriginalSize = successfulResults.reduce((sum, r) => sum + r.originalSize, 0);
    const totalCompressedSize = successfulResults.reduce((sum, r) => sum + r.compressedSize, 0);
    const totalReduction = Math.round((1 - totalCompressedSize / totalOriginalSize) * 100);
    const avgCompression = Math.round(
        successfulResults.reduce((sum, r) => sum + (r.compressionRatio * 100), 0) / successfulResults.length
    );
    
    document.getElementById('totalReduction').textContent = totalReduction + '%';
    document.getElementById('totalTime').textContent = totalTime + 'ms';
    document.getElementById('filesProcessed').textContent = results.length;
    document.getElementById('avgCompression').textContent = avgCompression + '%';
    
    document.getElementById('overallStats').classList.remove('hidden');
}

function downloadResult(index) {
    const result = compressionResults[index];
    const originalFile = selectedFiles[index];
    
    if (!result || !result.success) return;
    
    // Create blob and download
    const blob = new Blob([result.data], { type: `image/${result.format}` });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${originalFile.name.split('.')[0]}_compressed.${result.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
}

function previewResult(index) {
    const result = compressionResults[index];
    
    if (!result || !result.success) return;
    
    // Create blob URL for preview
    const blob = new Blob([result.data], { type: `image/${result.format}` });
    const url = URL.createObjectURL(blob);
    
    // Open in new window
    window.open(url, '_blank');
    
    // Clean up after a delay
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-24 right-6 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 transform translate-x-full`;
    
    // Set colors based on type
    switch (type) {
        case 'success':
            notification.classList.add('bg-green-500', 'text-white');
            break;
        case 'error':
            notification.classList.add('bg-red-500', 'text-white');
            break;
        case 'warning':
            notification.classList.add('bg-yellow-500', 'text-white');
            break;
        default:
            notification.classList.add('bg-blue-500', 'text-white');
    }
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation' : 'info'}-circle mr-3"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function scrollToDemo() {
    document.getElementById('demo').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Utility functions for advanced demo features
async function demonstrateAdvancedFeatures() {
    if (!kompreser) return;
    
    try {
        // Show performance stats
        const stats = await kompreser.getPerformanceStats();
        console.log('Performance Statistics:', stats);
        
        // Demonstrate format conversion
        if (selectedFiles.length > 0) {
            const webpResult = await kompreser.convert(selectedFiles[0], 'webp', {
                quality: 0.9
            });
            console.log('WebP conversion result:', webpResult);
        }
        
        // Show compression statistics
        const compressionStats = kompreser.compressionEngine?.getCompressionStats();
        console.log('Compression Statistics:', compressionStats);
        
    } catch (error) {
        console.error('Advanced features demo failed:', error);
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + Enter to compress
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        compressImages();
    }
    
    // Escape to clear selection
    if (event.key === 'Escape') {
        selectedFiles = [];
        document.getElementById('resultsContainer').innerHTML = `
            <div class="text-center text-white opacity-70">
                <i class="fas fa-image text-6xl mb-4 opacity-50"></i>
                <p>Upload images to see compression results</p>
            </div>
        `;
        document.getElementById('overallStats').classList.add('hidden');
    }
});

// Auto-demo functionality (for showcasing)
function startAutoDemo() {
    // This would be used for automated demonstrations
    console.log('Auto-demo started');
    
    // Generate sample statistics
    setInterval(() => {
        if (compressionResults.length > 0) {
            demonstrateAdvancedFeatures();
        }
    }, 10000); // Every 10 seconds
}

// Initialize auto-demo after page load
setTimeout(startAutoDemo, 5000);