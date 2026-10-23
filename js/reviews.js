// ── Collapsible reviews (show more / less) ──
function toggleExtraReviews() {
  const extra = document.getElementById('extraReviews');
  const btn = document.getElementById('reviewsToggleBtn');
  if (!extra || !btn) return;
  const isOpen = extra.classList.toggle('open');
  btn.textContent = isOpen ? 'Show fewer reviews ▴' : 'Show more reviews ▾';
}

// ── Review photo lightbox (with gallery scrolling) ──
let reviewGalleryImgs = [];
let reviewGalleryIndex = 0;

function openReviewLightbox(el) {
  const group = el.closest('.review-photos') || el.parentElement;
  reviewGalleryImgs = Array.from(group.querySelectorAll('.review-photo'));
  reviewGalleryIndex = reviewGalleryImgs.indexOf(el);
  showReviewLightboxImage();
  document.getElementById('reviewLightbox').classList.add('open');
}
function showReviewLightboxImage() {
  const img = reviewGalleryImgs[reviewGalleryIndex];
  document.getElementById('reviewLightboxImg').src = img.src;
  document.getElementById('reviewLightboxImg').alt = img.alt;
  const multi = reviewGalleryImgs.length > 1;
  document.getElementById('reviewLightboxPrev').classList.toggle('hidden', !multi);
  document.getElementById('reviewLightboxNext').classList.toggle('hidden', !multi);
  document.getElementById('reviewLightboxCounter').textContent = multi ? (reviewGalleryIndex + 1) + ' / ' + reviewGalleryImgs.length : '';
}
function navReviewLightbox(e, dir) {
  e.stopPropagation();
  reviewGalleryIndex = (reviewGalleryIndex + dir + reviewGalleryImgs.length) % reviewGalleryImgs.length;
  showReviewLightboxImage();
}
function closeReviewLightbox(e) {
  document.getElementById('reviewLightbox').classList.remove('open');
}
document.addEventListener('keydown', function(e) {
  if (!document.getElementById('reviewLightbox').classList.contains('open')) return;
  if (e.key === 'ArrowLeft') navReviewLightbox(e, -1);
  if (e.key === 'ArrowRight') navReviewLightbox(e, 1);
  if (e.key === 'Escape') closeReviewLightbox(e);
});
