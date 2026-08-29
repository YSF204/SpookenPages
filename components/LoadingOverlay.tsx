import Image from "next/image"

const LoadingOverlay = () => {
  return (
    <div className="loading-wrapper">
      <div className="loading-shadow-wrapper bg-white shadow-soft-md">
        <div className="loading-shadow">
          <Image
            src="/assets/loader.png"
            alt="Loading"
            width={64}
            height={64}
            className="loading-animation"
          />
          <h2 className="loading-title">Synthesizing your book...</h2>
          <div className="loading-progress">
            <div className="loading-progress-item">
              <span className="loading-progress-status" />
              <span className="text-[var(--text-secondary)]">
                Processing PDF and generating your interview assistant
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoadingOverlay
