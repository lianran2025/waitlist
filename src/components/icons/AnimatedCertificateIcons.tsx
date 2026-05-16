"use client"

import { forwardRef, useCallback, useImperativeHandle, useRef } from "react"
import type { SVGProps } from "react"
import { motion, useAnimate } from "motion/react"

export interface AnimatedIconProps extends Omit<
  SVGProps<SVGSVGElement>,
  | "ref"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onDrag"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragExit"
  | "onDragLeave"
  | "onDragOver"
  | "onDragStart"
  | "onDrop"
  | "values"
> {
  size?: number | string
  color?: string
  strokeWidth?: number
  className?: string
}

export interface AnimatedIconHandle {
  startAnimation: () => void
  stopAnimation: () => void
}

export const FileDescriptionIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }, ref) => {
    const [scope, animate] = useAnimate()

    const start = useCallback(async () => {
      await animate(".file-fold", { pathLength: [0, 1] }, { duration: 0.3, ease: "easeOut" })
      animate(".file-lines", { pathLength: [0, 1] }, { duration: 0.4, ease: "easeOut" })
    }, [animate])

    const stop = useCallback(async () => {
      animate(".file-fold, .file-lines", { pathLength: 1 }, { duration: 0.2 })
    }, [animate])

    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }))

    return (
      <motion.svg ref={scope} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`cursor-pointer ${className}`} onHoverStart={start} onHoverEnd={stop}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <motion.path d="M14 3v4a1 1 0 0 0 1 1h4" className="file-fold" />
        <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
        <motion.path d="M9 17h6" className="file-lines" />
        <motion.path d="M9 13h6" className="file-lines" />
      </motion.svg>
    )
  },
)
FileDescriptionIcon.displayName = "FileDescriptionIcon"

export const CpuIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }, ref) => {
    const [scope, animate] = useAnimate()

    const start = useCallback(() => {
      animate(".pins", { scale: [1, 1.15, 1] }, { duration: 0.5, ease: "easeInOut" })
      animate(".inner", { scale: [1, 0.9, 1] }, { duration: 0.5, ease: "easeInOut" })
      animate(".outer", { scale: [1, 1.05, 1] }, { duration: 0.5, ease: "easeInOut" })
    }, [animate])

    const stop = useCallback(() => {
      animate(".pins, .inner, .outer", { scale: 1 }, { duration: 0.2, ease: "easeInOut" })
    }, [animate])

    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }))

    return (
      <motion.svg ref={scope} onHoverStart={start} onHoverEnd={stop} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`cursor-pointer ${className}`}>
        <motion.g className="pins">
          <path d="M12 20v2" />
          <path d="M12 2v2" />
          <path d="M17 20v2" />
          <path d="M17 2v2" />
          <path d="M2 12h2" />
          <path d="M2 17h2" />
          <path d="M2 7h2" />
          <path d="M20 12h2" />
          <path d="M20 17h2" />
          <path d="M20 7h2" />
          <path d="M7 20v2" />
          <path d="M7 2v2" />
        </motion.g>
        <motion.rect className="outer" style={{ transformOrigin: "12px 12px" }} x="4" y="4" width="16" height="16" rx="2" />
        <motion.rect className="inner" style={{ transformOrigin: "12px 12px" }} x="8" y="8" width="8" height="8" rx="1" />
      </motion.svg>
    )
  },
)
CpuIcon.displayName = "CpuIcon"

export const SlidersHorizontalIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }, ref) => {
    const [scope, animate] = useAnimate()

    const start = useCallback(() => {
      animate(".slider-1", { x: [0, -4, 0] }, { duration: 2, repeat: Infinity, ease: "easeInOut" })
      animate(".path-1-left", { x2: [10, 6, 10] }, { duration: 2, repeat: Infinity, ease: "easeInOut" })
      animate(".path-1-right", { x1: [14, 10, 14] }, { duration: 2, repeat: Infinity, ease: "easeInOut" })
      animate(".slider-2", { x: [0, 4, 0] }, { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 })
      animate(".path-2-left", { x2: [8, 12, 8] }, { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 })
      animate(".path-2-right", { x1: [12, 16, 12] }, { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 })
      animate(".slider-3", { x: [0, -4, 0] }, { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 })
      animate(".path-3-left", { x2: [12, 8, 12] }, { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 })
      animate(".path-3-right", { x1: [16, 12, 16] }, { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 })
    }, [animate])

    const stop = useCallback(() => {
      animate(".slider-1, .slider-2, .slider-3", { x: 0 }, { duration: 0.3 })
      animate(".path-1-left", { x2: 10 }, { duration: 0.3 })
      animate(".path-1-right", { x1: 14 }, { duration: 0.3 })
      animate(".path-2-left", { x2: 8 }, { duration: 0.3 })
      animate(".path-2-right", { x1: 12 }, { duration: 0.3 })
      animate(".path-3-left", { x2: 12 }, { duration: 0.3 })
      animate(".path-3-right", { x1: 16 }, { duration: 0.3 })
    }, [animate])

    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }))

    return (
      <motion.svg ref={scope} onHoverStart={start} onHoverEnd={stop} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`cursor-pointer ${className}`}>
        <motion.line className="path-1-left" x1="3" y1="5" x2="10" y2="5" />
        <motion.line className="slider-1" x1="14" y1="3" x2="14" y2="7" />
        <motion.line className="path-1-right" x1="14" y1="5" x2="21" y2="5" />
        <motion.line className="path-2-left" x1="3" y1="12" x2="8" y2="12" />
        <motion.line className="slider-2" x1="8" y1="10" x2="8" y2="14" />
        <motion.line className="path-2-right" x1="12" y1="12" x2="21" y2="12" />
        <motion.line className="path-3-left" x1="3" y1="19" x2="12" y2="19" />
        <motion.line className="slider-3" x1="16" y1="17" x2="16" y2="21" />
        <motion.line className="path-3-right" x1="16" y1="19" x2="21" y2="19" />
      </motion.svg>
    )
  },
)
SlidersHorizontalIcon.displayName = "SlidersHorizontalIcon"

export const MapPinIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }, ref) => {
    const [scope, animate] = useAnimate()
    const isAnimatingRef = useRef(false)

    const start = useCallback(async () => {
      if (isAnimatingRef.current) return
      isAnimatingRef.current = true
      while (isAnimatingRef.current) {
        await animate(".pin-dot", { opacity: [1, 0.4, 1] }, { duration: 0.6, ease: "easeInOut" })
        if (!isAnimatingRef.current) break
      }
    }, [animate])

    const stop = useCallback(() => {
      isAnimatingRef.current = false
      animate(".pin-dot", { opacity: 1 }, { duration: 0.3 })
    }, [animate])

    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }))

    return (
      <motion.svg ref={scope} onHoverStart={start} onHoverEnd={stop} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`cursor-pointer ${className}`} style={{ overflow: "visible" }}>
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
        <motion.circle className="pin-dot" cx="12" cy="10" r="3" />
      </motion.svg>
    )
  },
)
MapPinIcon.displayName = "MapPinIcon"

export const Cloud3Icon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }, ref) => {
    const [scope, animate] = useAnimate()

    const start = useCallback(() => {
      animate(".status-dot", { opacity: [1, 0.4, 1] }, { duration: 1, repeat: Infinity, ease: "easeInOut", delay: (i: number) => i * 0.3 })
      animate("path.cloud-path", { scale: [1, 1.01, 1] }, { duration: 2, repeat: Infinity, ease: "easeInOut" })
    }, [animate])

    const stop = useCallback(() => {
      animate(".status-dot", { opacity: 1 }, { duration: 0.3 })
      animate("path.cloud-path", { scale: 1 }, { duration: 0.3 })
    }, [animate])

    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }))

    return (
      <motion.svg ref={scope} onHoverStart={start} onHoverEnd={stop} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`cursor-pointer ${className}`} style={{ overflow: "visible" }}>
        <motion.path className="cloud-path" d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" style={{ transformOrigin: "center" }} />
        <motion.circle className="status-dot" cx="9" cy="15" r="0.5" fill={color} custom={0} />
        <motion.circle className="status-dot" cx="12" cy="15" r="0.5" fill={color} custom={1} />
        <motion.circle className="status-dot" cx="15" cy="15" r="0.5" fill={color} custom={2} />
      </motion.svg>
    )
  },
)
Cloud3Icon.displayName = "Cloud3Icon"

export const DownloadIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }, ref) => {
    const [scope, animate] = useAnimate()
    const start = useCallback(() => {
      animate(".download-arrow", { y: [0, 3, 0] }, { duration: 0.55, ease: "easeInOut" })
      animate(".download-tray", { pathLength: [0.7, 1] }, { duration: 0.45, ease: "easeOut" })
    }, [animate])
    const stop = useCallback(() => {
      animate(".download-arrow", { y: 0 }, { duration: 0.2 })
      animate(".download-tray", { pathLength: 1 }, { duration: 0.2 })
    }, [animate])
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }))

    return (
      <motion.svg ref={scope} onHoverStart={start} onHoverEnd={stop} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`cursor-pointer ${className}`}>
        <motion.g className="download-arrow">
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
        </motion.g>
        <motion.path className="download-tray" d="M5 21h14" />
      </motion.svg>
    )
  },
)
DownloadIcon.displayName = "DownloadIcon"

export const CheckIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }, ref) => {
    const [scope, animate] = useAnimate()
    const start = useCallback(() => {
      animate(".check-ring", { scale: [1, 1.08, 1] }, { duration: 0.45, ease: "easeInOut" })
      animate(".check-mark", { pathLength: [0, 1] }, { duration: 0.35, ease: "easeOut" })
    }, [animate])
    const stop = useCallback(() => {
      animate(".check-ring", { scale: 1 }, { duration: 0.2 })
      animate(".check-mark", { pathLength: 1 }, { duration: 0.2 })
    }, [animate])
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }))

    return (
      <motion.svg ref={scope} onHoverStart={start} onHoverEnd={stop} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`cursor-pointer ${className}`} style={{ overflow: "visible" }}>
        <motion.circle className="check-ring" cx="12" cy="12" r="9" style={{ transformOrigin: "12px 12px" }} />
        <motion.path className="check-mark" d="m8 12 3 3 5-6" />
      </motion.svg>
    )
  },
)
CheckIcon.displayName = "CheckIcon"

export const ArrowBackIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }, ref) => {
    const [scope, animate] = useAnimate()
    const start = useCallback(() => {
      animate(".arrow-back", { x: [0, -3, 0] }, { duration: 0.45, ease: "easeInOut" })
    }, [animate])
    const stop = useCallback(() => {
      animate(".arrow-back", { x: 0 }, { duration: 0.2 })
    }, [animate])
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }))

    return (
      <motion.svg ref={scope} onHoverStart={start} onHoverEnd={stop} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`cursor-pointer ${className}`}>
        <motion.g className="arrow-back">
          <path d="M5 12h14" />
          <path d="m11 6-6 6 6 6" />
        </motion.g>
      </motion.svg>
    )
  },
)
ArrowBackIcon.displayName = "ArrowBackIcon"
