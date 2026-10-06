import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CartProvider } from '../src/contexts/CartContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import ProductDetailPage from '../src/pages/ProductDetailPage';
import { changePhotoZoom, clampPhotoIndex, nextPhotoIndex, photoSwipeStep, prepareProductPhotos } from '../src/lib/productPhotoViewer';

test('photo preparation removes empty and duplicate sources and caps the gallery', () => {
  const fallback = { src: '/images/product-placeholder.svg', alt: 'Fallback' };
  assert.deepEqual(prepareProductPhotos([{ src: '' }, { src: '/images/a.webp', alt: 'First' }, { src: ' /images/a.webp ' }], fallback), [{ src: '/images/a.webp', alt: 'First' }]);
  assert.deepEqual(prepareProductPhotos([], fallback), [fallback]);
  assert.equal(prepareProductPhotos(Array.from({ length: 40 }, (_, index) => ({ src: `/images/${index}.webp` })), fallback).length, 24);
});

test('gallery index remains bounded and navigation wraps in either direction', () => {
  assert.equal(clampPhotoIndex(99, 3), 2);
  assert.equal(clampPhotoIndex(-20, 3), 0);
  assert.equal(clampPhotoIndex(Number.NaN, 3), 0);
  assert.equal(nextPhotoIndex(0, -1, 3), 2);
  assert.equal(nextPhotoIndex(2, 1, 3), 0);
  assert.equal(nextPhotoIndex(2, 100, 3), 0);
  assert.equal(nextPhotoIndex(0, 1, 1), 0);
  assert.equal(nextPhotoIndex(0, 1, 0), 0);
});

test('actual zoom is restricted to supported 100%, 150% and 200% levels', () => {
  assert.equal(changePhotoZoom(1, 1), 1.5);
  assert.equal(changePhotoZoom(1.5, 1), 2);
  assert.equal(changePhotoZoom(2, 1), 2);
  assert.equal(changePhotoZoom(2, -1), 1.5);
  assert.equal(changePhotoZoom(1.5, -1), 1);
  assert.equal(changePhotoZoom(1, -1), 1);
  assert.equal(changePhotoZoom(Number.NaN, -1), 1);
});

test('photo browsing only responds to short deliberate one-finger horizontal swipes at normal zoom', () => {
  const start = { x: 300, y: 100, time: 100 };
  assert.equal(photoSwipeStep(start, { x: 190, y: 105, time: 300 }, 1, 1), 1);
  assert.equal(photoSwipeStep(start, { x: 410, y: 105, time: 300 }, 1, 1), -1);
  assert.equal(photoSwipeStep(start, { x: 245, y: 100, time: 300 }, 1, 1), 0);
  assert.equal(photoSwipeStep(start, { x: 190, y: 240, time: 300 }, 1, 1), 0);
  assert.equal(photoSwipeStep(start, { x: 190, y: 105, time: 300 }, 2, 1), 0);
  assert.equal(photoSwipeStep(start, { x: 190, y: 105, time: 300 }, 1, 2), 0);
  assert.equal(photoSwipeStep(start, { x: 190, y: 105, time: 1100 }, 1, 1), 0);
  assert.equal(photoSwipeStep(start, { x: 190, y: 105, time: 50 }, 1, 1), 0);
  assert.equal(photoSwipeStep(start, { x: Number.NaN, y: 105, time: 300 }, 1, 1), 0);
});

function renderDetail(id: string) {
  return renderToString(<MemoryRouter initialEntries={[`/product/${id}`]}><LanguageProvider><CartProvider><Routes><Route path="/product/:id" element={<ProductDetailPage />} /></Routes></CartProvider></LanguageProvider></MemoryRouter>);
}

test('product detail offers an explicit dialog control and actual multiple-photo thumbnails', () => {
  const html = renderDetail('pista');
  assert.match(html, /aria-haspopup="dialog" aria-expanded="false"/);
  assert.match(html, /pista-secondary-v1\.webp/);
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /class="product-photo-viewer"/);
  assert.match(html, /href="\/product\/kaju"/);
});

test('single-photo products retain the photo viewer control without duplicate thumbnails', () => {
  const html = renderDetail('oil-almond');
  assert.match(html, /aria-haspopup="dialog" aria-expanded="false"/);
  assert.doesNotMatch(html, /oil-almond-secondary/);
  assert.doesNotMatch(html, /role="dialog"/);
});
