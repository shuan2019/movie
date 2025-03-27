let currentPage = 1;
let totalPages = 1;
let keyword = '';

let currentCategory = '';

// 公告加载
window.addEventListener('DOMContentLoaded', () => {
  fetch('./gg.txt')
    .then(response => {
      if (!response.ok) throw new Error('文件加载失败');
      return response.text();
    })
    .then(text => {
      const announcement = document.querySelector('.announcement-content');
      announcement.textContent = text || '暂无公告';
    })
    .catch(error => {
      console.error('公告加载失败:', error);
      document.querySelector('.announcement-content').textContent = '公告加载失败，请检查文件是否存在';
    });
});

async function renderCategories() {
    try {
        const response = await fetch('/proxy/api.php/provide/vod/?ac=category');
        const data = await response.json();
        const menu = document.getElementById('categoryMenu');
        
        menu.innerHTML = data.class.filter(cat => ![1,2,3,4].includes(cat.type_id)).map(cat => 
            `<a class="category-item" data-id="${cat.type_id}">${cat.type_name}</a>`
        ).join('');
        
        menu.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', () => {
                currentCategory = item.dataset.id;
                loadVideos(1);
            });
        });
    } catch (error) {
        console.error('加载分类失败:', error);
    }
}

async function loadVideos(page = 1) {
    try {
        if (!document.getElementById('videoContainer')) {
            throw new Error('找不到视频容器元素');
        }
        
        const apiUrl = `/proxy/api.php/provide/vod/?ac=list&pg=${page}&wd=${encodeURIComponent(keyword)}${currentCategory ? '&t=' + currentCategory : ''}`;
        console.log('正在请求API:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('响应状态:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP错误 ${response.status}`);
        }
        
        const data = await response.json();
        console.log('原始响应数据:', JSON.stringify(data, null, 2));
        
        if (!data.list || !Array.isArray(data.list)) {
            throw new Error('无效的API响应结构');
        }
        
        console.log('首个视频对象详情:', JSON.stringify(data.list[0], null, 2));
        totalPages = data.total || 1;
        renderVideos(data.list);
        renderPagination();
    } catch (error) {
        console.error('加载视频失败:', error);
        document.getElementById('videoContainer').innerHTML = `<div class="error">数据加载失败：${error.message}</div>`;
    }
}

async function renderVideos(videos) {
    const container = document.getElementById('videoContainer');
    if (!container) {
        console.error('错误：找不到videoContainer元素');
        return;
    }
    
    if (!videos || !Array.isArray(videos)) {
        container.innerHTML = '<div class="no-results">无效的视频数据格式</div>';
        return;
    }
    
    // 验证首个视频对象字段
    if(videos.length > 0 && !videos[0].vod_name) {
        console.warn('API响应字段异常:', videos[0]);
        container.innerHTML = '<div class="error">接口数据结构异常，请联系管理员</div>';
        return;
    }
    
    if (videos.length === 0) {
        container.innerHTML = '<div class="no-results">没有找到相关视频</div>';
        return;
    }
    
    // 数据完整性检查并补全
    const processedVideos = await Promise.all(videos.map(async video => {
        if (!video.vod_pic) {
            try {
                const detail = await getVideoDetail(video.vod_id);
                return {...video, ...detail};
            } catch (e) {
                console.warn('补全视频数据失败:', e);
                return video;
            }
        }
        return video;
    }));

    console.log('处理后的视频数据:', processedVideos[0]);

    container.innerHTML = processedVideos.map(video => `
        <div class="video-card">
            <img src="${video.vod_pic}" class="video-cover" alt="封面" onerror="handleImageError(this, '${video.vod_pic}')">
            <div class="video-info">
                <h3>${video.vod_name}</h3>
                <div class="video-meta">
                  <span>年份：${video.vod_year || '未知'}</span>
                  <span>地区：${video.vod_area || '未知'}</span>
                  <span>类型：${video.vod_class || '未知'}</span>
                </div>
                <div class="play-control">
                  <select class="play-select">

${(video.vod_play_url?.split('#') || []).map((url, index) => {
                        const [title, link] = url.split('$', 2);
                        return link && link.trim() ? `<option value="https://vip.vipuuvip.com/?url=${link.trim()}" ${index === 0 ? 'selected' : ''}>${title?.trim() || '播放源'} ${index + 1}</option>` : '';
                    }).filter(Boolean).join('')}
                </select>
                  <button class="play-btn" onclick="event.stopPropagation(); createVideoModal(this.parentNode.querySelector('select').value)">播放</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderPagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = `
        <button class="prev-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="loadVideos(${currentPage - 1})">上一页</button>
        <button class="next-btn" ${currentPage >= totalPages ? 'disabled' : ''} onclick="loadVideos(${currentPage + 1})">下一页</button>
    `;
}

// 新增获取详情数据的通用方法
async function getVideoDetail(vodId) {
    try {
        const response = await fetch(`/proxy/api.php/provide/vod/?ac=detail&ids=${vodId}`);
        const data = await response.json();
        return data.list && data.list[0];
    } catch (error) {
        console.error('获取详情数据失败:', error);
        throw error;
    }
}

async function showDetail(vodId) {
    try {
        const response = await fetch(`/proxy/api.php/provide/vod/?ac=detail&ids=${vodId}`);
        const data = await response.json();
        
        if(window.location.pathname.includes('detail.html')) {
            const detail = data.list && data.list[0];
            if(detail) {
                document.getElementById('vodName').textContent = detail.vod_name;
                document.getElementById('detailCover').src = detail.vod_pic;
                document.getElementById('vodYear').textContent = `年份：${detail.vod_year}`;
                document.getElementById('vodArea').textContent = `地区：${detail.vod_area}`;
                document.getElementById('vodClass').textContent = `类型：${detail.vod_class}`;
                document.getElementById('vodContent').textContent = detail.vod_content;
                
                // 解析播放地址
                const playList = document.getElementById('playList');
                playList.innerHTML = detail.vod_play_url.split(',').map(url => 
                    `<a href="${url.trim()}" target="_blank" class="play-link">播放地址</a>`
                ).join('');
            }
        } else {
            window.location.href = `detail.html?id=${vodId}`;
        }
    } catch (error) {
        console.error('加载详情失败:', error);
    }
}

// 视频模态框功能
function createVideoModal(videoUrl) {
    const modal = document.createElement('div');
    modal.className = 'video-modal';
    
    const mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.onclick = () => document.body.removeChild(modal);
    
    const container = document.createElement('div');
    container.className = 'video-container';
    container.innerHTML = `
        <iframe src="${videoUrl}" allowfullscreen></iframe>
        <button class="close-btn">&times;</button>
    `;
    
    container.querySelector('.close-btn').onclick = () => document.body.removeChild(modal);
    
    modal.appendChild(mask);
    modal.appendChild(container);
    document.body.appendChild(modal);
}

// 详情页初始化
if(window.location.pathname.includes('detail.html')) {
    const urlParams = new URLSearchParams(window.location.search);
    const vodId = urlParams.get('id');
    if(vodId) showDetail(vodId);
}

// 初始化搜索功能
document.getElementById('searchInput').addEventListener('input', (e) => {
    keyword = e.target.value;
});

// 初始加载
function handleImageError(imgElement, originalSrc) {
    // 保留原始调试信息
    console.group('图片加载错误追踪');
    console.log('原始地址:', originalSrc);
    console.log('DOM路径:', getDomPath(imgElement));
    console.groupEnd();
    console.log(`图片加载失败，原始地址: ${originalSrc}，已重试次数: ${imgElement.dataset.retryCount || 0}`);
    
    if (!imgElement.dataset.retryCount) {
        imgElement.dataset.retryCount = 0;
    }
    
    if (imgElement.dataset.retryCount < 3) {
        console.log(`第${Number(imgElement.dataset.retryCount)+1}次重试: ${originalSrc}`);
        imgElement.src = originalSrc + '?retry=' + Date.now();
        imgElement.dataset.retryCount++;
    } else {
        console.error('最终加载失败:', originalSrc);
        // 移除自动替换CDN地址逻辑
        imgElement.style.opacity = '1';
        imgElement.alt = '';
        // 保留最终错误日志
console.error('图片加载最终失败:', {
    element: getDomPath(imgElement),
    src: originalSrc,
    retries: imgElement.dataset.retryCount
});
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadVideos();
    renderCategories();
});