import React, { ReactChildren } from 'react'
import ReactModal from 'react-modal'

import styles from './Modal.module.scss'

ReactModal.setAppElement('#___gatsby')

export default function Modal({
  title,
  isOpen,
  handleCloseModal,
  children,
  ...props
}: {
  title?: string
  isOpen?: boolean
  handleCloseModal: any
  children: ReactChildren
}) {
  if (!isOpen) return null

  return (
    <ReactModal
      overlayClassName={styles.modal}
      className={styles.modal__content}
      htmlOpenClassName={styles.isModalOpen}
      shouldReturnFocusAfterClose={false}
      isOpen={isOpen}
      {...props}
    >
      {title && <h1 className={styles.modal__title}>{title}</h1>}
      {children}
      <button className={styles.modal__close} onClick={handleCloseModal}>
        &times;
      </button>
    </ReactModal>
  )
}
