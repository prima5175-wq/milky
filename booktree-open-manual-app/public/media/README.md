# 이미지 · 동영상 넣는 곳

이 폴더에 파일을 넣고, `src/data/manual.js` 의 `media` 배열에서
`/media/파일명` 으로 참조하면 앱에 바로 나와요.

```javascript
media: [
  { type: 'image', src: '/media/step04-도면.jpg', caption: '표준 강의실 도면' },
  { type: 'video', src: '/media/설명회.mp4', poster: '/media/설명회-표지.jpg', caption: '설명회 시연' },
  { type: 'video', src: 'https://youtu.be/XXXXXXXXXXX', caption: '간판 시공 과정' },
]
```

- **이미지**: jpg · png · webp 권장. 가로 1200px 정도면 충분해요.
- **동영상**: 유튜브·비메오 링크를 넣는 걸 가장 추천해요 (배포 용량이 늘지 않아요).
  직접 올릴 경우 mp4(H.264)로 넣고, 되도록 20MB 이하로 줄여주세요.
- `src` 를 비워두면 "준비 중" 안내 자리가 표시돼요. 자료가 아직 없을 때 써요.
- 파일명에 한글·공백을 써도 되지만, 영문·하이픈이 더 안전해요.
