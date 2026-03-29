    const slider = document.getElementById('slider');
    const marker = document.getElementById('marker');
    const band = document.getElementById('band');
    const spectrum = document.getElementById('spectrum');
    const sampler = document.getElementById('sampler');
    const ctx = sampler.getContext('2d');
    const rValue = document.getElementById('rValue');
    const gValue = document.getElementById('gValue');
    const bValue = document.getElementById('bValue');

    const navigationMap = document.getElementById('navigationMap');
    const viewfinder = document.getElementById('viewfinder');
    const viewfinderCore = document.getElementById('viewfinderCore');
    const viewfinderScene = document.getElementById('viewfinderScene');
    const coordsValue = document.getElementById('coordsValue');
    const immersionSection = document.getElementById('immersionSection');
    const immersionRise = document.getElementById('immersionRise');
    const immersionMaxLift = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--immersion-rise')) || 527;
    const researchStage = document.getElementById('researchStage');
    const researchTriangles = Array.from(document.querySelectorAll('.research-stage .stalactite'));
    const researchShatter = document.getElementById('researchShatter');
    const researchShatterSvg = document.getElementById('researchShatterSvg');
    const resultVisual = document.getElementById('resultVisual');
    const resultStateNodes = Array.from(document.querySelectorAll('[data-result-state]'));
    const resultCopyNodes = Array.from(document.querySelectorAll('[data-result-copy]'));

    const gradientStops = [
      [0.00, 'rgb(255, 0, 255)'],
      [0.08, 'rgb(210, 0, 255)'],
      [0.16, 'rgb(145, 0, 255)'],
      [0.24, 'rgb(76, 0, 255)'],
      [0.30, 'rgb(0, 0, 255)'],
      [0.38, 'rgb(0, 0, 255)'],
      [0.46, 'rgb(0, 96, 255)'],
      [0.54, 'rgb(0, 190, 255)'],
      [0.62, 'rgb(0, 235, 210)'],
      [0.70, 'rgb(0, 255, 110)'],
      [0.78, 'rgb(96, 255, 0)'],
      [0.86, 'rgb(190, 255, 0)'],
      [0.92, 'rgb(255, 235, 0)'],
      [0.96, 'rgb(255, 120, 0)'],
      [0.985, 'rgb(255, 0, 0)'],
      [1.00, 'rgb(255, 0, 0)']
    ];

    const navTarget = {
      x: 0.66,
      y: 0.50,
      radius: 26
    };

    const navState = {
      x: 0.50,
      y: 0.50,
      currentLat: 55.755778,
      currentLon: 37.617611,
      targetLat: 55.755778,
      targetLon: 37.617611,
      hit: false
    };

    let dragState = null;

    function buildGradient() {
      const gradient = ctx.createLinearGradient(0, 0, sampler.width, 0);
      gradientStops.forEach(([stop, color]) => gradient.addColorStop(stop, color));
      ctx.clearRect(0, 0, sampler.width, sampler.height);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, sampler.width, sampler.height);

      if (spectrum) {
        const cssGradient = gradientStops
          .map(([stop, color]) => `${color} ${stop * 100}%`)
          .join(', ');
        spectrum.style.background = `linear-gradient(90deg, ${cssGradient})`;
      }
    }

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function parseRgb(color) {
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!match) {
        return [0, 0, 0];
      }

      return [Number(match[1]), Number(match[2]), Number(match[3])];
    }

    function lerp(start, end, amount) {
      return start + ((end - start) * amount);
    }

    function getInterpolatedColor(ratio) {
      const safeRatio = clamp(ratio, 0, 1);

      for (let i = 0; i < gradientStops.length - 1; i += 1) {
        const [startStop, startColor] = gradientStops[i];
        const [endStop, endColor] = gradientStops[i + 1];

        if (safeRatio >= startStop && safeRatio <= endStop) {
          const mix = endStop === startStop ? 0 : (safeRatio - startStop) / (endStop - startStop);
          const [r1, g1, b1] = parseRgb(startColor);
          const [r2, g2, b2] = parseRgb(endColor);

          return [
            Math.round(lerp(r1, r2, mix)),
            Math.round(lerp(g1, g2, mix)),
            Math.round(lerp(b1, b2, mix))
          ];
        }
      }

      return parseRgb(gradientStops[gradientStops.length - 1][1]);
    }

    function setSliderState() {
      const ratio = Number(slider.value) / Number(slider.max);
      const [r, g, b] = getInterpolatedColor(ratio);
      marker.style.left = `${ratio * band.clientWidth}px`;

      rValue.textContent = `{ ${r}`;
      gValue.textContent = `{ ${g}`;
      bValue.textContent = `{ ${b}`;
    }

    function calcLatLon(xRatio, yRatio) {
      const latMax = 55.7629;
      const latMin = 55.7414;
      const lonMin = 37.5932;
      const lonMax = 37.6418;

      return {
        lat: latMax - yRatio * (latMax - latMin),
        lon: lonMin + xRatio * (lonMax - lonMin)
      };
    }

    function toDms(decimal) {
      const absolute = Math.abs(decimal);
      const degrees = Math.floor(absolute);
      const minutesFloat = (absolute - degrees) * 60;
      const minutes = Math.floor(minutesFloat);
      const seconds = (minutesFloat - minutes) * 60;

      return `${degrees}° ${String(minutes).padStart(2, '0')}' ${seconds.toFixed(1)}"`;
    }

    function updateCoordsText() {
      coordsValue.textContent = toDms(navState.currentLat);
    }

    function animateCoords() {
      navState.currentLat += (navState.targetLat - navState.currentLat) * 0.14;
      navState.currentLon += (navState.targetLon - navState.currentLon) * 0.14;
      updateCoordsText();
      requestAnimationFrame(animateCoords);
    }

    function restartCoordsBlink() {
      coordsValue.classList.remove('is-blinking');
      void coordsValue.offsetWidth;
      coordsValue.classList.add('is-blinking');
      window.clearTimeout(restartCoordsBlink.timer);
      restartCoordsBlink.timer = window.setTimeout(() => {
        coordsValue.classList.remove('is-blinking');
      }, 2200);
    }

    function applyViewfinderPosition() {
      const mapWidth = navigationMap.clientWidth;
      const mapHeight = navigationMap.clientHeight;
      const vfWidth = viewfinder.offsetWidth;
      const vfHeight = viewfinder.offsetHeight;
      const framePad = 18;

      const minLeft = framePad;
      const maxLeft = Math.max(framePad, mapWidth - vfWidth - framePad);
      const minTop = framePad;
      const maxTop = Math.max(framePad, mapHeight - vfHeight - framePad);

      const left = minLeft + navState.x * (maxLeft - minLeft);
      const top = minTop + navState.y * (maxTop - minTop);

      viewfinder.style.left = `${left}px`;
      viewfinder.style.top = `${top}px`;

      viewfinderScene.style.width = `${mapWidth}px`;
      viewfinderScene.style.height = `${mapHeight}px`;
      viewfinderScene.style.transform = `translate(${-left}px, ${-top}px)`;

      const coords = calcLatLon(navState.x, navState.y);
      navState.targetLat = coords.lat;
      navState.targetLon = coords.lon;

      const targetX = navTarget.x * mapWidth;
      const targetY = navTarget.y * mapHeight;
      const rectLeft = left;
      const rectRight = left + vfWidth;
      const rectTop = top;
      const rectBottom = top + vfHeight;

      const closestX = clamp(targetX, rectLeft, rectRight);
      const closestY = clamp(targetY, rectTop, rectBottom);
      const dx = targetX - closestX;
      const dy = targetY - closestY;
      const hit = (dx * dx + dy * dy) <= (navTarget.radius * navTarget.radius);

      if (hit && !navState.hit) {
        restartCoordsBlink();
      }

      navState.hit = hit;
    }

    
    const immersionEmptyBarsGroup = document.getElementById('immersionEmptyBars');
    const immersionRiseGroup = document.getElementById('immersionRise');

    function extractRectX(rect) {
      const xAttr = rect.getAttribute('x');
      if (xAttr != null) return parseFloat(xAttr) || 0;
      const transformAttr = rect.getAttribute('transform') || '';
      const matrixMatch = transformAttr.match(/matrix\([^)]*\s([\-\d.]+)\s+([\-\d.]+)\)$/);
      if (matrixMatch) return parseFloat(matrixMatch[1]) || 0;
      const translateMatch = transformAttr.match(/translate\(([-\d.]+)/);
      if (translateMatch) return parseFloat(translateMatch[1]) || 0;
      return 0;
    }

    function sortSvgRectsByX(rects) {
      return [...rects].sort((a, b) => extractRectX(a) - extractRectX(b));
    }

    const emptyRectsSorted = immersionEmptyBarsGroup
      ? sortSvgRectsByX(immersionEmptyBarsGroup.querySelectorAll('rect'))
      : [];

    const riseAllRects = immersionRiseGroup ? [...immersionRiseGroup.querySelectorAll('rect')] : [];
    const riseBgRect = riseAllRects.length ? riseAllRects[0] : null;
    const riseRectsSorted = riseAllRects.length
      ? sortSvgRectsByX(riseAllRects.slice(1))
      : [];

    function saveRectState(rect) {
      return {
        x: rect.getAttribute('x'),
        y: rect.getAttribute('y'),
        width: rect.getAttribute('width'),
        height: rect.getAttribute('height'),
        transform: rect.getAttribute('transform'),
        fill: rect.getAttribute('fill'),
        display: rect.style.display || ''
      };
    }

    const emptyRectStates = new Map(emptyRectsSorted.map((rect) => [rect, saveRectState(rect)]));
    const riseRectStates = new Map(riseRectsSorted.map((rect) => [rect, saveRectState(rect)]));

    const compactEmptyBars = [
      { x: 40,   y: 394, width: 130, height: 400 },
      { x: 275,  y: 498, width: 128, height: 116 },
      { x: 403,  y: 266, width: 132, height: 232 },
      { x: 552,  y: 614, width: 130, height: 180 },
      { x: 682,  y: 383, width: 128, height: 231 },
      { x: 811,  y: 266, width: 130, height: 117 },
      { x: 1110, y: 266, width: 130, height: 348 }
    ];

    const compactRiseBars = [
      { x: 40,   y: 793,  width: 130, height: 375, fill: 'url(#immCompactGrad0)' },
      { x: 275,  y: 903,  width: 128, height: 140, fill: 'url(#immCompactGrad6)' },
      { x: 403,  y: 1043, width: 132, height: 280, fill: 'url(#immCompactGrad2)' },
      { x: 552,  y: 793,  width: 130, height: 110, fill: 'url(#immCompactGrad5)' },
      { x: 682,  y: 903,  width: 128, height: 279, fill: 'url(#immCompactGrad3)' },
      { x: 811,  y: 1182, width: 130, height: 141, fill: 'url(#immCompactGrad4)' },
      { x: 1110, y: 844,  width: 130, height: 479, fill: 'url(#immCompactGrad1)' }
    ];

    function restoreRect(rect, state) {
      if (!state) return;
      if (state.x == null) rect.removeAttribute('x'); else rect.setAttribute('x', state.x);
      if (state.y == null) rect.removeAttribute('y'); else rect.setAttribute('y', state.y);
      if (state.width == null) rect.removeAttribute('width'); else rect.setAttribute('width', state.width);
      if (state.height == null) rect.removeAttribute('height'); else rect.setAttribute('height', state.height);
      if (state.transform == null) rect.removeAttribute('transform'); else rect.setAttribute('transform', state.transform);
      if (state.fill == null) rect.removeAttribute('fill'); else rect.setAttribute('fill', state.fill);
      rect.style.display = state.display;
    }

    function applyImmersionBarLayout() {
      const compactMode = window.innerWidth <= 1024;

      emptyRectsSorted.forEach((rect, index) => {
        const state = emptyRectStates.get(rect);
        if (!compactMode) {
          restoreRect(rect, state);
          return;
        }

        if (index < compactEmptyBars.length) {
          const cfg = compactEmptyBars[index];
          rect.removeAttribute('transform');
          rect.setAttribute('x', cfg.x);
          rect.setAttribute('y', cfg.y);
          rect.setAttribute('width', cfg.width);
          rect.setAttribute('height', cfg.height);
          rect.style.display = '';
        } else {
          rect.style.display = 'none';
        }
      });

      riseRectsSorted.forEach((rect, index) => {
        const state = riseRectStates.get(rect);
        if (!compactMode) {
          restoreRect(rect, state);
          return;
        }

        if (index < compactRiseBars.length) {
          const cfg = compactRiseBars[index];
          rect.removeAttribute('transform');
          rect.setAttribute('x', cfg.x);
          rect.setAttribute('y', cfg.y);
          rect.setAttribute('width', cfg.width);
          rect.setAttribute('height', cfg.height);
          rect.setAttribute('fill', cfg.fill || ((state && state.fill) ? state.fill : 'url(#barsGrad)'));
          rect.style.display = '';
        } else {
          rect.style.display = 'none';
        }
      });

      if (riseBgRect) {
        riseBgRect.style.display = '';
      }
    }

    window.addEventListener('resize', applyImmersionBarLayout);

    const immersionState = {
      progress: 0,
      touchY: null
    };

    function setImmersionProgress(progress) {
      if (!immersionRise) {
        return;
      }

      immersionState.progress = clamp(progress, 0, 1);
      const lift = immersionMaxLift * immersionState.progress;
      immersionRise.setAttribute('transform', `translate(0 ${(-lift).toFixed(2)})`);
    }

    function alignImmersionSection() {
      if (!immersionSection) {
        return;
      }

      const sectionTop = immersionSection.getBoundingClientRect().top + window.scrollY;
      if (Math.abs(window.scrollY - sectionTop) > 1) {
        window.scrollTo(0, sectionTop);
      }
    }

    function shouldCaptureImmersion(direction) {
      if (!immersionSection || !immersionRise || direction === 0) {
        return false;
      }

      const rect = immersionSection.getBoundingClientRect();
      const isVisible = rect.bottom > 0 && rect.top < window.innerHeight;
      const isNearTop = rect.top <= 2 && rect.bottom >= (window.innerHeight * 0.35);

      if (!isVisible || !isNearTop) {
        return false;
      }

      if (direction > 0) {
        return immersionState.progress < 1;
      }

      return immersionState.progress > 0;
    }

    function applyImmersionDelta(delta) {
      if (!delta) {
        return;
      }

      const sensitivity = 1 / (immersionMaxLift * 1.75);
      setImmersionProgress(immersionState.progress + (delta * sensitivity));
    }

    function handleImmersionWheel(event) {
      const direction = Math.sign(event.deltaY);

      if (!shouldCaptureImmersion(direction)) {
        return;
      }

      event.preventDefault();
      alignImmersionSection();
      applyImmersionDelta(event.deltaY);
    }

    function handleImmersionTouchStart(event) {
      if (!event.touches || !event.touches.length) {
        return;
      }

      immersionState.touchY = event.touches[0].clientY;
    }

    function handleImmersionTouchMove(event) {
      if (!event.touches || !event.touches.length || immersionState.touchY == null) {
        return;
      }

      const currentY = event.touches[0].clientY;
      const delta = immersionState.touchY - currentY;
      const direction = Math.sign(delta);

      if (!shouldCaptureImmersion(direction)) {
        immersionState.touchY = currentY;
        return;
      }

      event.preventDefault();
      alignImmersionSection();
      applyImmersionDelta(delta * 1.15);
      immersionState.touchY = currentY;
    }

    function handleImmersionTouchEnd() {
      immersionState.touchY = null;
    }


    const researchTimers = new WeakMap();
    const SVG_NS = 'http://www.w3.org/2000/svg';

    const researchShardTemplates = {
      s1: {
        width: 287,
        height: 249,
        pieces: [
          { d: 'M116.851 0.75349L142.89 248.551L4.99742e-05 0.506078L116.851 0.75349Z', fill: 'url(#researchShardS1A)' },
          { d: 'M237.179 87.3253L142.894 248.556L116.855 0.758108L237.179 87.3253Z', fill: 'url(#researchShardS1B)' },
          { d: 'M116.852 0.755503L286.521 -2.47402e-06L237.176 87.3226L116.852 0.755503Z', fill: 'url(#researchShardS1C)' }
        ]
      },
      s2: {
        width: 287,
        height: 249,
        pieces: [
          { d: 'M227.625 101.348L0.00617531 -1.51195e-05L286.264 0.276382L227.625 101.348Z', fill: 'url(#researchShardS2A)' },
          { d: 'M92.4874 162.27L7.82554e-05 0.00125758L227.619 101.35L92.4874 162.27Z', fill: 'url(#researchShardS2B)' },
          { d: 'M227.622 101.348L143.442 248.664L92.491 162.268L227.622 101.348Z', fill: 'url(#researchShardS2C)' }
        ]
      },
      s3: {
        width: 288,
        height: 249,
        pieces: [
          { d: 'M85.4871 147.493L287.067 1.04366L143.698 248.812L85.4871 147.493Z', fill: 'url(#researchShardS3A)' },
          { d: 'M100.297 -8.62049e-07L287.069 1.03776L85.4891 147.487L100.297 -8.62049e-07Z', fill: 'url(#researchShardS3B)' },
          { d: 'M85.4886 147.491L-6.32096e-05 0.930939L100.296 0.00367755L85.4886 147.491Z', fill: 'url(#researchShardS3C)' }
        ]
      }
    };


    function createSvgNode(tagName) {
      return document.createElementNS(SVG_NS, tagName);
    }

    function pointFromWeights(vertexA, vertexB, vertexC, n, u, v, w) {
      return {
        x: ((u * vertexA.x) + (v * vertexB.x) + (w * vertexC.x)) / n,
        y: ((u * vertexA.y) + (v * vertexB.y) + (w * vertexC.y)) / n
      };
    }

    function subdivideTriangle(vertexA, vertexB, vertexC, divisionCount) {
      const triangles = [];

      for (let row = 0; row < divisionCount; row += 1) {
        const currentRow = [];
        const nextRow = [];

        for (let col = 0; col <= (divisionCount - row); col += 1) {
          currentRow.push(
            pointFromWeights(vertexA, vertexB, vertexC, divisionCount, divisionCount - row - col, col, row)
          );
        }

        for (let col = 0; col <= (divisionCount - row - 1); col += 1) {
          nextRow.push(
            pointFromWeights(vertexA, vertexB, vertexC, divisionCount, divisionCount - row - 1 - col, col, row + 1)
          );
        }

        for (let col = 0; col < nextRow.length; col += 1) {
          triangles.push([currentRow[col], currentRow[col + 1], nextRow[col]]);

          if (col < nextRow.length - 1) {
            triangles.push([currentRow[col + 1], nextRow[col + 1], nextRow[col]]);
          }
        }
      }

      return triangles;
    }


    function explodeResearchTriangle(triangle) {
      if (!researchStage || !researchShatter || !researchShatterSvg || !triangle || triangle.classList.contains('is-hidden')) {
        return;
      }

      const templateKey = triangle.classList.contains('s1')
        ? 's1'
        : triangle.classList.contains('s2')
          ? 's2'
          : 's3';
      const template = researchShardTemplates[templateKey];

      if (!template) {
        return;
      }

      const existingTimer = researchTimers.get(triangle);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      const stageRect = researchStage.getBoundingClientRect();
      const triangleRect = triangle.getBoundingClientRect();
      const originLeft = triangleRect.left - stageRect.left;
      const originTop = triangleRect.top - stageRect.top;
      const width = triangleRect.width;
      const height = triangleRect.height;
      const centerX = originLeft + (width / 2);
      const scaleX = width / template.width;
      const scaleY = height / template.height;

      researchShatterSvg.setAttribute('viewBox', `0 0 ${Math.max(1, Math.round(stageRect.width))} ${Math.max(1, Math.round(stageRect.height))}`);

      const shardNodes = [];

      template.pieces.forEach((piece, pieceIndex) => {
        const outerGroup = createSvgNode('g');
        outerGroup.setAttribute(
          'transform',
          `translate(${originLeft.toFixed(2)} ${originTop.toFixed(2)}) scale(${scaleX.toFixed(5)} ${scaleY.toFixed(5)})`
        );

        const innerGroup = createSvgNode('g');
        innerGroup.classList.add('research-shard-piece');

        const path = createSvgNode('path');
        path.setAttribute('d', piece.d);
        path.setAttribute('fill', piece.fill);

        innerGroup.appendChild(path);
        outerGroup.appendChild(innerGroup);
        researchShatterSvg.appendChild(outerGroup);
        shardNodes.push(outerGroup);

        const sideways = templateKey === 's2'
          ? [-68, 0, 76][pieceIndex]
          : templateKey === 's1'
            ? [-92, 18, 96][pieceIndex]
            : [-88, 22, 102][pieceIndex];
        const vertical = templateKey === 's2'
          ? [250, 302, 278][pieceIndex]
          : templateKey === 's1'
            ? [316, 262, 214][pieceIndex]
            : [222, 270, 328][pieceIndex];
        const rotation = templateKey === 's2'
          ? [-24, 10, 28][pieceIndex]
          : templateKey === 's1'
            ? [-34, 16, 38][pieceIndex]
            : [-38, 18, 34][pieceIndex];
        const delay = [0, 70, 130][pieceIndex];
        const duration = [1550, 1660, 1780][pieceIndex] + (pieceIndex * 30);

        innerGroup.style.setProperty('--tx', `${(sideways / Math.max(scaleX, 0.0001)).toFixed(2)}px`);
        innerGroup.style.setProperty('--ty', `${(vertical / Math.max(scaleY, 0.0001)).toFixed(2)}px`);
        innerGroup.style.setProperty('--rot', `${rotation}deg`);
        innerGroup.style.setProperty('--delay', `${delay}ms`);
        innerGroup.style.setProperty('--dur', `${duration}ms`);
      });

      triangle.classList.add('is-hidden');

      requestAnimationFrame(() => {
        shardNodes.forEach((outerGroup) => {
          const animatedGroup = outerGroup.firstElementChild;
          if (animatedGroup) {
            animatedGroup.classList.add('is-active');
          }
        });
      });

      const resetTimer = window.setTimeout(() => {
        shardNodes.forEach((node) => node.remove());
        triangle.classList.remove('is-hidden');
        researchTimers.delete(triangle);
      }, 2900);

      researchTimers.set(triangle, resetTimer);
    }


    const resultState = {
      index: 0
    };

    const resultRotationState = {
      values: resultStateNodes.map(() => 0),
      pointerId: null,
      group: null,
      prism: null,
      centerX: 0,
      centerY: 0,
      startAngle: 0,
      startRotation: 0,
      moved: false,
      startX: 0,
      startY: 0
    };

    function getAngleFromCenter(clientX, clientY, centerX, centerY) {
      return Math.atan2(clientY - centerY, clientX - centerX);
    }

    function normalizeAngleDelta(delta) {
      if (delta > Math.PI) {
        return delta - (Math.PI * 2);
      }
      if (delta < -Math.PI) {
        return delta + (Math.PI * 2);
      }
      return delta;
    }

    function syncResultRotations() {
      resultStateNodes.forEach((node, index) => {
        const angle = resultRotationState.values[index] || 0;
        node.style.transform = `rotate(${angle}deg)`;
      });
    }

    function applyResultState(nextIndex) {
      if (!resultStateNodes.length || !resultCopyNodes.length) {
        return;
      }

      const normalized = ((nextIndex % resultStateNodes.length) + resultStateNodes.length) % resultStateNodes.length;
      resultState.index = normalized;

      resultStateNodes.forEach((node, index) => {
        node.classList.toggle('is-active', index === normalized);
      });

      resultCopyNodes.forEach((node, index) => {
        node.classList.toggle('is-active', index === normalized);
      });

      syncResultRotations();
    }

    function advanceResultState() {
      applyResultState(resultState.index + 1);
    }


    function syncFromPointer(clientX, clientY) {
      const rect = navigationMap.getBoundingClientRect();
      const vfWidth = viewfinder.offsetWidth;
      const vfHeight = viewfinder.offsetHeight;
      const framePad = 18;
      const minLeft = framePad;
      const maxLeft = Math.max(framePad, rect.width - vfWidth - framePad);
      const minTop = framePad;
      const maxTop = Math.max(framePad, rect.height - vfHeight - framePad);

      const rawLeft = clientX - rect.left - dragState.shiftX;
      const rawTop = clientY - rect.top - dragState.shiftY;
      const left = clamp(rawLeft, minLeft, maxLeft);
      const top = clamp(rawTop, minTop, maxTop);

      navState.x = (left - minLeft) / Math.max(1, maxLeft - minLeft);
      navState.y = (top - minTop) / Math.max(1, maxTop - minTop);

      applyViewfinderPosition();
    }

    viewfinder.addEventListener('pointerdown', (event) => {
      const vfRect = viewfinder.getBoundingClientRect();
      dragState = {
        pointerId: event.pointerId,
        shiftX: event.clientX - vfRect.left,
        shiftY: event.clientY - vfRect.top
      };
      viewfinder.classList.add('dragging');
      viewfinder.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    viewfinder.addEventListener('pointermove', (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      syncFromPointer(event.clientX, event.clientY);
    });

    function endDrag(event) {
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      viewfinder.classList.remove('dragging');
      dragState = null;
    }

    viewfinder.addEventListener('pointerup', endDrag);
    viewfinder.addEventListener('pointercancel', endDrag);
    viewfinder.addEventListener('lostpointercapture', () => {
      viewfinder.classList.remove('dragging');
      dragState = null;
    });

    researchTriangles.forEach((triangle) => {
      triangle.addEventListener('click', () => {
        explodeResearchTriangle(triangle);
      });

      triangle.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          explodeResearchTriangle(triangle);
        }
      });
    });


    if (resultVisual) {
      resultVisual.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          advanceResultState();
        }
      });

      resultVisual.addEventListener('pointerdown', (event) => {
        const prism = event.target.closest('.result-prism');
        if (!prism) {
          return;
        }

        const group = prism.closest('[data-result-state]');
        if (!group) {
          return;
        }

        const activeIndex = Number(group.getAttribute('data-result-state'));
        const groupRect = group.getBoundingClientRect();

        resultRotationState.pointerId = event.pointerId;
        resultRotationState.group = group;
        resultRotationState.prism = prism;
        resultRotationState.centerX = groupRect.left + (groupRect.width / 2);
        resultRotationState.centerY = groupRect.top + (groupRect.height / 2);
        resultRotationState.startAngle = getAngleFromCenter(
          event.clientX,
          event.clientY,
          resultRotationState.centerX,
          resultRotationState.centerY
        );
        resultRotationState.startRotation = resultRotationState.values[activeIndex] || 0;
        resultRotationState.moved = false;
        resultRotationState.startX = event.clientX;
        resultRotationState.startY = event.clientY;

        resultVisual.classList.add('is-pressed');
        group.classList.add('is-rotating');
        resultVisual.setPointerCapture(event.pointerId);
        event.preventDefault();
      });

      resultVisual.addEventListener('pointermove', (event) => {
        if (resultRotationState.pointerId !== event.pointerId || !resultRotationState.group) {
          return;
        }

        const activeIndex = Number(resultRotationState.group.getAttribute('data-result-state'));
        const angle = getAngleFromCenter(
          event.clientX,
          event.clientY,
          resultRotationState.centerX,
          resultRotationState.centerY
        );
        const delta = normalizeAngleDelta(angle - resultRotationState.startAngle);
        const nextRotation = resultRotationState.startRotation + (delta * (180 / Math.PI));
        const travel = Math.hypot(
          event.clientX - resultRotationState.startX,
          event.clientY - resultRotationState.startY
        );

        if (travel > 6 || Math.abs(nextRotation - resultRotationState.startRotation) > 4) {
          resultRotationState.moved = true;
        }

        resultRotationState.values[activeIndex] = nextRotation;
        resultRotationState.group.style.transform = `rotate(${nextRotation}deg)`;
      });

      const finishResultPointer = (event, allowTapAdvance) => {
        if (resultRotationState.pointerId !== event.pointerId) {
          return;
        }

        const tapped = allowTapAdvance && !resultRotationState.moved;
        const activeGroup = resultRotationState.group;

        resultVisual.classList.remove('is-pressed');
        if (activeGroup) {
          activeGroup.classList.remove('is-rotating');
        }

        resultRotationState.pointerId = null;
        resultRotationState.group = null;
        resultRotationState.prism = null;

        if (tapped) {
          advanceResultState();
        }
      };

      resultVisual.addEventListener('pointerup', (event) => {
        finishResultPointer(event, true);
      });

      resultVisual.addEventListener('pointercancel', (event) => {
        finishResultPointer(event, false);
      });

      resultVisual.addEventListener('lostpointercapture', () => {
        resultVisual.classList.remove('is-pressed');
        if (resultRotationState.group) {
          resultRotationState.group.classList.remove('is-rotating');
        }
        resultRotationState.pointerId = null;
        resultRotationState.group = null;
        resultRotationState.prism = null;
      });
    }


    slider.addEventListener('input', setSliderState);

    function handleResize() {
      applyViewfinderPosition();
      applyImmersionBarLayout();
    setImmersionProgress(immersionState.progress);
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('wheel', handleImmersionWheel, { passive: false });
    window.addEventListener('touchstart', handleImmersionTouchStart, { passive: true });
    window.addEventListener('touchmove', handleImmersionTouchMove, { passive: false });
    window.addEventListener('touchend', handleImmersionTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleImmersionTouchEnd, { passive: true });

    buildGradient();
    setSliderState();
    applyViewfinderPosition();
    setImmersionProgress(0);
    animateCoords();
    applyResultState(0);
  