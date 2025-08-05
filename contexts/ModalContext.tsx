import React, { createContext, useContext, useState, useCallback } from 'react';
import CustomModal, { ModalProps } from '../components/CustomModal';

interface ModalContextType {
  showAlert: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: React.ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    props: Partial<ModalProps>;
  }>({
    isOpen: false,
    props: {}
  });

  const closeModal = useCallback(() => {
    setModalState({ isOpen: false, props: {} });
  }, []);

  const showAlert = useCallback((
    title: string, 
    message: string, 
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ) => {
    setModalState({
      isOpen: true,
      props: {
        title,
        message,
        type,
        onClose: closeModal
      }
    });
  }, [closeModal]);

  const showConfirm = useCallback((
    title: string, 
    message: string, 
    onConfirm: () => void
  ) => {
    setModalState({
      isOpen: true,
      props: {
        title,
        message,
        type: 'confirm',
        onClose: closeModal,
        onConfirm
      }
    });
  }, [closeModal]);

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, closeModal }}>
      {children}
      <CustomModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.props.title || ''}
        message={modalState.props.message || ''}
        type={modalState.props.type}
        onConfirm={modalState.props.onConfirm}
      />
    </ModalContext.Provider>
  );
};

export default ModalProvider;
