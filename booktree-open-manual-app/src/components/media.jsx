import React from 'react';
import { Icon } from './icons.jsx';

/*
 * 매뉴얼 본문에 이미지·동영상을 넣는 블록이에요.
 *
 * src/data/manual.js 의 각 항목에 media 배열을 넣으면 자동으로 렌더링됩니다.
 *
 *   media: [
 *     { type: 'image', src: '/media/step04-도면.jpg', caption: '인테리어 도면 예시' },
 *     { type: 'video', src: 'https://youtu.be/XXXXXXXXXXX', caption: '간판 시공 과정' },
 *     { type: 'video', caption: '개원식 스케치 (촬영 예정)' },   // src 없으면 준비중 슬롯
 *   ]
 *
 * - 이미지 파일은 public/media/ 아래에 넣고 '/media/파일명' 으로 참조해요.
 * - 동영상은 유튜브/비메오 링크를 그대로 넣으면 embed로 바뀌고,
 *   mp4 파일을 직접 넣으면 <video> 플레이어로 재생됩니다.
 * - src 를 비워두면 "준비 중" 안내 슬롯이 나와서, 자료가 아직 없어도 자리를 잡아둘 수 있어요.
 */

// 유튜브 링크에서 영상 ID를 뽑아내요 (youtu.be / watch?v= / embed / shorts 모두 지원)
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

  // 아직 자료가 없으면 자리만 잡아두는 슬롯
  if (!src) {
    const Ico = type === 'video' ? Icon.Video : Icon.Image;
    return (
      <figure className="media-figure">
        <div className={`media-slot ${type}`}>
          <Ico />
          <div className="media-slot-label">{caption || (type === 'video' ? '동영상 준비 중' : '이미지 준비 중')}</div>
          <div>{type === 'video' ? '촬영 후 이곳에 올라가요' : '자료가 준비되면 이곳에 표시돼요'}</div>
        </div>
      </figure>
    );
  }

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

// media 배열을 통째로 받아 그리드로 그려요. 2개 이상이면 넓은 화면에서 2열.
function MediaBlock({ media, heading = '📎 참고 자료' }) {
  if (!media || media.length === 0) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <div className="section-heading">{heading}</div>
      <div className={`media-grid ${media.length > 1 ? 'cols-2' : ''}`}>
        {media.map((item, i) => <MediaItem key={i} item={item} />)}
      </div>
    </div>
  );
}

export { MediaBlock, MediaItem };
