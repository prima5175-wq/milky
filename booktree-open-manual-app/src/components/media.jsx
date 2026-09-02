import React from 'react';

/*
 * 매뉴얼 본문의 이미지·동영상 블록.
 *
 * src/data/manual.js 의 단계에 media 배열을 넣으면 상세 화면에 나와요.
 *
 *   media: [
 *     { type: 'image', src: '/media/step04-도면.jpg', caption: '표준 강의실 도면' },
 *     { type: 'video', src: 'https://youtu.be/XXXXXXXXXXX', caption: '간판 시공 과정' },
 *   ]
 *
 * - 이미지 파일은 public/media/ 에 넣고 '/media/파일명' 으로 참조해요.
 * - 유튜브·비메오 링크는 자동으로 embed 플레이어가 되고,
 *   mp4 를 직접 넣으면 <video> 로 재생돼요.
 * - src 가 없는 항목은 화면에 아무것도 그리지 않고 조용히 건너뜁니다.
 *   (빈 자리 표시는 실제 원장님이 보는 화면에 노출되면 안 되니까요)
 */

function youTubeId(url) {
  const m = String(url).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function vimeoId(url) {
  const m = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

function embedUrl(src) {
  const yt = youTubeId(src);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}?rel=0`;
  const vm = vimeoId(src);
  if (vm) return `https://player.vimeo.com/video/${vm}`;
  return null;
}

function MediaItem({ item }) {
  const { type = 'image', src, caption, poster, alt } = item;
  if (!src) return null;

  if (type === 'video') {
    const embed = embedUrl(src);
    return (
      <figure className="media-figure">
        {embed ? (
          <div className="media-embed">
            <iframe
              src={embed}
              title={caption || '매뉴얼 동영상'}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <video controls preload="metadata" poster={poster} playsInline>
            <source src={src} />
            브라우저가 동영상 재생을 지원하지 않아요.
          </video>
        )}
        {caption && <figcaption className="media-caption">{caption}</figcaption>}
      </figure>
    );
  }

  return (
    <figure className="media-figure">
      <img src={src} alt={alt || caption || ''} loading="lazy" />
      {caption && <figcaption className="media-caption">{caption}</figcaption>}
    </figure>
  );
}

function MediaBlock({ media, heading = '참고 자료' }) {
  // src 가 실제로 있는 항목만 추려요. 하나도 없으면 섹션 자체를 그리지 않아요.
  const items = (media || []).filter(m => m && m.src);
  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div className="section-heading">{heading}</div>
      <div className={`media-grid ${items.length > 1 ? 'cols-2' : ''}`}>
        {items.map((item, i) => <MediaItem key={i} item={item} />)}
      </div>
    </div>
  );
}

export { MediaBlock, MediaItem };
