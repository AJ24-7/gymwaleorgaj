/**
 * =========================================
 * ENHANCED UNIFIED MODAL SYSTEM v2.0
 * =========================================
 * A comprehensive modal management system for gymadmin
 */

class EnhancedModalSystem {
    constructor() {
        this.modals = new Map();
        this.activeModal = null;
        this.modalStack = [];
        this.defaultOptions = {
            size: 'md', // sm, md, lg, xl, fullscreen
            type: 'default', // default, success, warning, danger, info
            backdrop: true,
            keyboard: true,
            animation: 'slide-in',
            autoFocus: true,
            closeOnBackdrop: true,
            closeOnEscape: true
        };
        
        this.init();
    }

    init() {
        // Create modal container if it doesn't exist
        if (!document.getElementById('enhanced-modal-container')) {
            const container = document.createElement('div');
            container.id = 'enhanced-modal-container';
            document.body.appendChild(container);
        }
        
        // Bind global event listeners
        document.addEventListener('keydown', this.handleKeydown.bind(this));
        
        // Initialize existing modals
        this.convertExistingModals();
    }

    /**
     * Create a new modal
     * @param {string} id - Modal ID
     * @param {Object} options - Modal options
     * @returns {Object} Modal instance
     */
    createModal(id, options = {}) {
        const config = { ...this.defaultOptions, ...options };
        
        const modalElement = this.createModalElement(id, config);
        const modalInstance = new Modal(id, modalElement, config, this);
        
        this.modals.set(id, modalInstance);
        return modalInstance;
    }

    /**
     * Create modal DOM element
     */
    createModalElement(id, config) {
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = `enhanced-modal enhanced-modal-${config.size} enhanced-modal-${config.type}`;
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        
        modal.innerHTML = `
            <div class="enhanced-modal-content" role="document">
                <div class="enhanced-modal-header">
                    <h4 class="enhanced-modal-title">
                        ${config.icon ? `<i class="${config.icon}"></i>` : ''}
                        ${config.title || 'Modal'}
                    </h4>
                    <button type="button" class="enhanced-modal-close" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="enhanced-modal-body">
                    ${config.content || ''}
                </div>
                ${config.footer !== false ? `
                    <div class="enhanced-modal-footer">
                        ${this.createFooterButtons(config.buttons)}
                    </div>
                ` : ''}
            </div>
        `;
        
        document.getElementById('enhanced-modal-container').appendChild(modal);
        return modal;
    }

    /**
     * Create footer buttons
     */
    createFooterButtons(buttons = []) {
        if (buttons.length === 0) {
            return `
                <button type="button" class="enhanced-btn enhanced-btn-secondary" data-dismiss="modal">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button type="button" class="enhanced-btn enhanced-btn-primary" data-action="confirm">
                    <i class="fas fa-check"></i> Confirm
                </button>
            `;
        }
        
        return buttons.map(button => `
            <button type="button" 
                    class="enhanced-btn enhanced-btn-${button.variant || 'primary'}" 
                    data-action="${button.action || 'close'}"
                    ${button.disabled ? 'disabled' : ''}>
                ${button.icon ? `<i class="${button.icon}"></i>` : ''}
                ${button.text}
            </button>
        `).join('');
    }

    /**
     * Show modal
     * @param {string} id - Modal ID
     * @param {Object} data - Data to pass to modal
     */
    show(id, data = {}) {
        const modal = this.modals.get(id);
        if (!modal) {
            console.error(`Modal with ID "${id}" not found`);
            return;
        }

        // Close current modal if exists and not stacking
        if (this.activeModal && this.activeModal.id !== id) {
            this.modalStack.push(this.activeModal.id);
        }

        this.activeModal = modal;
        modal.show(data);
    }

    /**
     * Hide modal
     * @param {string} id - Modal ID
     */
    hide(id) {
        const modal = this.modals.get(id);
        if (!modal) return;

        modal.hide();
        
        // Restore previous modal from stack
        if (this.modalStack.length > 0) {
            const previousModalId = this.modalStack.pop();
            this.activeModal = this.modals.get(previousModalId);
        } else {
            this.activeModal = null;
        }
    }

    /**
     * Get modal instance
     * @param {string} id - Modal ID
     * @returns {Object} Modal instance
     */
    getModal(id) {
        return this.modals.get(id);
    }

    /**
     * Handle keyboard events
     */
    handleKeydown(event) {
        if (event.key === 'Escape' && this.activeModal && this.activeModal.config.closeOnEscape) {
            this.hide(this.activeModal.id);
        }
    }

    /**
     * Quick modal creation methods
     */
    alert(title, message, type = 'info') {
        const id = `alert-${Date.now()}`;
        const modal = this.createModal(id, {
            title,
            content: `<p>${message}</p>`,
            type,
            size: 'sm',
            buttons: [{
                text: 'OK',
                variant: 'primary',
                action: 'close'
            }],
            icon: this.getTypeIcon(type)
        });
        
        this.show(id);
        return modal;
    }

    confirm(title, message, onConfirm, onCancel = null) {
        const id = `confirm-${Date.now()}`;
        const modal = this.createModal(id, {
            title,
            content: `<p>${message}</p>`,
            type: 'warning',
            size: 'sm',
            buttons: [
                {
                    text: 'Cancel',
                    variant: 'secondary',
                    action: 'cancel'
                },
                {
                    text: 'Confirm',
                    variant: 'danger',
                    action: 'confirm'
                }
            ],
            icon: 'fas fa-exclamation-triangle'
        });
        
        modal.on('action:confirm', () => {
            this.hide(id);
            if (onConfirm) onConfirm();
        });
        
        modal.on('action:cancel', () => {
            this.hide(id);
            if (onCancel) onCancel();
        });
        
        this.show(id);
        return modal;
    }

    prompt(title, message, defaultValue = '', onSubmit = null) {
        const id = `prompt-${Date.now()}`;
        const modal = this.createModal(id, {
            title,
            content: `
                <p>${message}</p>
                <div class="form-group">
                    <input type="text" id="prompt-input" class="form-control" value="${defaultValue}">
                </div>
            `,
            type: 'info',
            size: 'sm',
            buttons: [
                {
                    text: 'Cancel',
                    variant: 'secondary',
                    action: 'cancel'
                },
                {
                    text: 'Submit',
                    variant: 'primary',
                    action: 'submit'
                }
            ],
            icon: 'fas fa-question-circle'
        });
        
        modal.on('action:submit', () => {
            const input = document.getElementById('prompt-input');
            const value = input ? input.value : '';
            this.hide(id);
            if (onSubmit) onSubmit(value);
        });
        
        modal.on('action:cancel', () => {
            this.hide(id);
        });
        
        this.show(id);
        
        // Focus input after modal is shown
        setTimeout(() => {
            const input = document.getElementById('prompt-input');
            if (input) input.focus();
        }, 100);
        
        return modal;
    }

    /**
     * Form modal helper
     */
    createFormModal(id, title, formHTML, onSubmit, options = {}) {
        const config = {
            title,
            content: `<form id="${id}-form">${formHTML}</form>`,
            buttons: [
                {
                    text: 'Cancel',
                    variant: 'secondary',
                    action: 'cancel'
                },
                {
                    text: 'Submit',
                    variant: 'primary',
                    action: 'submit'
                }
            ],
            ...options
        };
        
        const modal = this.createModal(id, config);
        
        modal.on('action:submit', () => {
            const form = document.getElementById(`${id}-form`);
            if (form && onSubmit) {
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                onSubmit(data, form);
            }
        });
        
        modal.on('action:cancel', () => {
            this.hide(id);
        });
        
        return modal;
    }

    /**
     * Get icon for modal type
     */
    getTypeIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            danger: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle',
            default: 'fas fa-window-maximize'
        };
        return icons[type] || icons.default;
    }

    /**
     * Convert existing modals to enhanced system
     */
    convertExistingModals() {
        const existingModals = document.querySelectorAll('.modal:not(.enhanced-modal)');
        existingModals.forEach(modal => {
            // Add enhanced classes while preserving existing functionality
            modal.classList.add('enhanced-modal-legacy');
        });
    }

    /**
     * Loading modal helper
     */
    showLoading(message = 'Loading...') {
        const id = 'loading-modal';
        
        // Remove existing loading modal
        if (this.modals.has(id)) {
            this.hide(id);
        }
        
        const modal = this.createModal(id, {
            title: 'Loading',
            content: `
                <div style="text-align: center; padding: 20px;">
                    <div class="enhanced-modal .loading-spinner"></div>
                    <p style="margin-top: 15px;">${message}</p>
                </div>
            `,
            type: 'info',
            size: 'sm',
            footer: false,
            closeOnBackdrop: false,
            closeOnEscape: false,
            icon: 'fas fa-spinner fa-spin'
        });
        
        this.show(id);
        return modal;
    }

    /**
     * Hide loading modal
     */
    hideLoading() {
        this.hide('loading-modal');
    }

    /**
     * Destroy modal
     */
    destroy(id) {
        const modal = this.modals.get(id);
        if (modal) {
            modal.destroy();
            this.modals.delete(id);
        }
    }

    /**
     * Destroy all modals
     */
    destroyAll() {
        this.modals.forEach(modal => modal.destroy());
        this.modals.clear();
        this.activeModal = null;
        this.modalStack = [];
    }
}

/**
 * Individual Modal Class
 */
class Modal {
    constructor(id, element, config, system) {
        this.id = id;
        this.element = element;
        this.config = config;
        this.system = system;
        this.eventListeners = new Map();
        this.isVisible = false;
        
        this.bindEvents();
    }

    bindEvents() {
        // Close button
        const closeBtn = this.element.querySelector('.enhanced-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // Backdrop click
        if (this.config.closeOnBackdrop) {
            this.element.addEventListener('click', (e) => {
                if (e.target === this.element) {
                    this.hide();
                }
            });
        }

        // Footer buttons
        const footer = this.element.querySelector('.enhanced-modal-footer');
        if (footer) {
            footer.addEventListener('click', (e) => {
                const button = e.target.closest('[data-action]');
                if (button) {
                    const action = button.getAttribute('data-action');
                    this.trigger(`action:${action}`, e);
                    
                    if (action === 'close' || button.hasAttribute('data-dismiss')) {
                        this.hide();
                    }
                }
            });
        }
    }

    show(data = {}) {
        if (this.isVisible) return;

        // Trigger before show event
        this.trigger('beforeShow', data);

        // Apply data to modal
        this.applyData(data);

        // Show modal
        this.element.style.display = 'flex';
        this.element.setAttribute('aria-hidden', 'false');
        
        // Add animation
        setTimeout(() => {
            this.element.classList.add('active');
            if (this.config.animation) {
                this.element.classList.add(this.config.animation);
            }
        }, 10);

        // Focus management
        if (this.config.autoFocus) {
            this.focusFirst();
        }

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        this.isVisible = true;
        this.trigger('show', data);
    }

    hide() {
        if (!this.isVisible) return;

        this.trigger('beforeHide');

        // Add closing animation
        this.element.classList.add('closing');
        
        setTimeout(() => {
            this.element.style.display = 'none';
            this.element.setAttribute('aria-hidden', 'true');
            this.element.classList.remove('active', 'closing');
            if (this.config.animation) {
                this.element.classList.remove(this.config.animation);
            }
            
            // Restore body scroll if no other modals
            if (this.system.modalStack.length === 0) {
                document.body.style.overflow = '';
            }
            
            this.isVisible = false;
            this.trigger('hide');
        }, 300);
    }

    applyData(data) {
        // Update title if provided
        if (data.title) {
            const titleElement = this.element.querySelector('.enhanced-modal-title');
            if (titleElement) {
                titleElement.innerHTML = `
                    ${this.config.icon ? `<i class="${this.config.icon}"></i>` : ''}
                    ${data.title}
                `;
            }
        }

        // Update content if provided
        if (data.content) {
            const bodyElement = this.element.querySelector('.enhanced-modal-body');
            if (bodyElement) {
                bodyElement.innerHTML = data.content;
            }
        }
    }

    focusFirst() {
        const focusable = this.element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
            focusable[0].focus();
        }
    }

    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    trigger(event, data = null) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                callback.call(this, data);
            });
        }
    }

    destroy() {
        this.hide();
        this.element.remove();
        this.eventListeners.clear();
    }

    setLoading(loading = true) {
        const existingOverlay = this.element.querySelector('.loading-overlay');
        
        if (loading) {
            if (!existingOverlay) {
                const overlay = document.createElement('div');
                overlay.className = 'loading-overlay';
                overlay.innerHTML = '<div class="enhanced-modal .loading-spinner"></div>';
                this.element.querySelector('.enhanced-modal-content').appendChild(overlay);
            }
        } else {
            if (existingOverlay) {
                existingOverlay.remove();
            }
        }
    }

    updateContent(content) {
        const bodyElement = this.element.querySelector('.enhanced-modal-body');
        if (bodyElement) {
            bodyElement.innerHTML = content;
        }
    }

    updateTitle(title) {
        const titleElement = this.element.querySelector('.enhanced-modal-title');
        if (titleElement) {
            titleElement.innerHTML = `
                ${this.config.icon ? `<i class="${this.config.icon}"></i>` : ''}
                ${title}
            `;
        }
    }
}

// Initialize the modal system
const modalSystem = new EnhancedModalSystem();

// Global helper functions for backward compatibility
window.ModalSystem = modalSystem;
window.showModal = (id, data) => modalSystem.show(id, data);
window.hideModal = (id) => modalSystem.hide(id);
window.createModal = (id, options) => modalSystem.createModal(id, options);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnhancedModalSystem, Modal };
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Enhanced Modal System v2.0 initialized');
    });
} else {
    console.log('Enhanced Modal System v2.0 initialized');
}
