import React, { useMemo } from 'react';
import './GradualBlur.css';

const GradualBlur = ({
  preset = 'header',
  strength = 1.5,
  opacity = 0.9,
  divCount = 8,
  height = null,
  width = '100%',
  position = null,
  curve = 'ease-out',
  className = '',
  style = {},
  zIndex = null
}) => {
  // Preset defaults configuration
  const config = useMemo(() => {
    let resolvedPosition = position;
    let resolvedHeight = height;
    let direction = 'to bottom';
    let defaultZIndex = 45;

    switch (preset) {
      case 'header':
      case 'top':
        resolvedPosition = resolvedPosition || 'fixed';
        resolvedHeight = resolvedHeight || '110px';
        direction = 'to bottom';
        defaultZIndex = 45;
        break;
      case 'footer':
      case 'bottom':
        resolvedPosition = resolvedPosition || 'fixed';
        resolvedHeight = resolvedHeight || '100px';
        direction = 'to top';
        defaultZIndex = 45;
        break;
      case 'card':
        resolvedPosition = resolvedPosition || 'absolute';
        resolvedHeight = resolvedHeight || '100%';
        direction = 'to bottom';
        defaultZIndex = 5;
        break;
      case 'full':
        resolvedPosition = resolvedPosition || 'absolute';
        resolvedHeight = resolvedHeight || '100%';
        direction = 'to bottom';
        defaultZIndex = 1;
        break;
      default:
        resolvedPosition = resolvedPosition || 'absolute';
        resolvedHeight = resolvedHeight || '100px';
        direction = 'to bottom';
        defaultZIndex = 10;
        break;
    }

    return {
      position: resolvedPosition,
      height: typeof resolvedHeight === 'number' ? `${resolvedHeight}px` : resolvedHeight,
      direction,
      zIndex: zIndex !== null && zIndex !== undefined ? zIndex : defaultZIndex
    };
  }, [preset, position, height, zIndex]);

  // Compute mathematical progressive blur layers
  const layers = useMemo(() => {
    const layerList = [];
    const count = Math.max(2, Math.min(16, divCount));

    for (let i = 0; i < count; i++) {
      const progress = (i + 1) / count;
      let factor = progress;

      if (curve === 'ease-out') {
        factor = Math.sin((progress * Math.PI) / 2);
      } else if (curve === 'ease-in') {
        factor = 1 - Math.cos((progress * Math.PI) / 2);
      } else if (curve === 'exponential') {
        factor = Math.pow(progress, 2);
      }

      // Max blur radius scaled by strength
      const blurRadius = Math.max(0.5, factor * 16 * strength);

      // Gradient mask steps
      const startPercent = Math.max(0, Math.round(((i) / count) * 100));
      const midPercent = Math.min(100, Math.round(((i + 1) / count) * 100));
      const endPercent = Math.min(100, Math.round(((i + 2) / count) * 100));

      const maskGradient = `linear-gradient(${config.direction}, rgba(0,0,0,1) ${startPercent}%, rgba(0,0,0,0.8) ${midPercent}%, rgba(0,0,0,0) ${endPercent}%)`;

      layerList.push({
        id: i,
        blurFilter: `blur(${blurRadius.toFixed(1)}px)`,
        maskGradient
      });
    }

    return layerList;
  }, [divCount, strength, curve, config.direction]);

  const containerStyles = {
    position: config.position,
    top: preset === 'footer' || preset === 'bottom' ? 'auto' : 0,
    bottom: preset === 'footer' || preset === 'bottom' ? 0 : 'auto',
    left: 0,
    right: 0,
    width,
    height: config.height,
    zIndex: config.zIndex,
    opacity,
    pointerEvents: 'none',
    ...style
  };

  return (
    <div
      className={`gradual-blur-container preset-${preset} ${className}`}
      style={containerStyles}
      aria-hidden="true"
    >
      {layers.map((layer) => (
        <div
          key={layer.id}
          className="gradual-blur-layer"
          style={{
            '--blur-filter': layer.blurFilter,
            '--mask-gradient': layer.maskGradient
          }}
        />
      ))}
    </div>
  );
};

export default GradualBlur;
