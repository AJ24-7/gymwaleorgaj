/**
 * Quick Actions Customizer
 * Handles customization of quick action buttons layout and visibility
 */

class QuickActionsCustomizer {
    constructor() {
        this.currentLayout = 'default';
        this.floatingPosition = 'right';
        this.visibleActions = new Set(['add-member', 'record-payment', 'add-trainer', 'add-equipment', 'generate-qr', 'biometric-enroll', 'device-setup', 'send-notification']);
        this.actionMappings = {
            'add-member': { button: '#addMemberBtn', title: 'Add Member', icon: 'fas fa-user-plus' },
            'record-payment': { button: '#recordPaymentBtn', title: 'Record Payment', icon: 'fas fa-money-bill-wave' },
            'add-trainer': { button: '#addTrainerBtn', title: 'Add Trainer', icon: 'fas fa-user-tie' },
            'add-equipment': { button: '#uploadEquipmentBtn', title: 'Add Equipment', icon: 'fas fa-dumbbell' },
            'generate-qr': { button: '#generateQRCodeBtn', title: 'Generate QR Code', icon: 'fas fa-qrcode' },
            'biometric-enroll': { button: '#biometricEnrollBtn', title: 'Biometric Enrollment', icon: 'fas fa-fingerprint' },
            'device-setup': { button: '#deviceSetupBtn', title: 'Setup Devices', icon: 'fas fa-cogs' },
            'send-notification': { button: '#sendNotificationQuickBtn', title: 'Send Notification', icon: 'fas fa-bell' }
        };
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.bindEvents();
        this.applyLayout();
        this.updateVisibility();
        // Ensure dynamic sizing is applied on initialization
        this.applyDynamicSizing();
    }

    bindEvents() {
        // Customize button from card
        const customizeBtn = document.getElementById('customizeQuickActionsBtn');
        if (customizeBtn) {
            customizeBtn.addEventListener('click', () => this.openCustomizeModal());
        }

        // Customize button from settings
        const settingsCustomizeBtn = document.getElementById('openQuickActionsCustomizeFromSettings');
        if (settingsCustomizeBtn) {
            settingsCustomizeBtn.addEventListener('click', () => this.openCustomizeModal());
        }

        // Close modal
        const closeModalBtn = document.getElementById('closeQuickActionsCustomizeModal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeCustomizeModal());
        }

        // Save customization
        const saveBtn = document.getElementById('saveQuickActionsCustomization');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveCustomization());
        }

        // Reset to default
        const resetBtn = document.getElementById('resetQuickActionsCustomization');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetToDefault());
        }

        // Layout change handlers
        document.querySelectorAll('input[name="quickActionsLayout"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.handleLayoutChange(e.target.value);
            });
        });

        document.querySelectorAll('input[name="quickActionsLayoutSetting"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.handleLayoutChange(e.target.value);
                this.saveSettings();
            });
        });

        // Position change handlers
        document.querySelectorAll('input[name="floatingPosition"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.floatingPosition = e.target.value;
                this.updateFloatingBarPosition();
            });
        });

        // Action toggle handlers
        document.querySelectorAll('.action-toggle input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const action = e.target.dataset.action;
                if (e.target.checked) {
                    this.visibleActions.add(action);
                } else {
                    this.visibleActions.delete(action);
                }
            });
        });

        // Floating bar toggle
        const floatingToggle = document.getElementById('floatingBarToggle');
        if (floatingToggle) {
            floatingToggle.addEventListener('click', () => this.hideFloatingBar());
        }

        // Sidebar assistant close
        const circularClose = document.getElementById('circularPanelClose');
        if (circularClose) {
            circularClose.addEventListener('click', () => this.hideCircularAssistant());
        }

        // Circular toggle
        const circularToggle = document.getElementById('circularToggle');
        if (circularToggle) {
            circularToggle.addEventListener('click', () => this.toggleCircularAssistant());
        }

        // Action button clicks for floating and circular
        this.bindActionButtons();

        // Search functionality for circular assistant
        const circularSearch = document.getElementById('circularSearch');
        if (circularSearch) {
            circularSearch.addEventListener('input', (e) => this.filterCircularActions(e.target.value));
        }
    }

    bindActionButtons() {
        // Floating bar actions
        document.querySelectorAll('.floating-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.executeAction(action);
            });
        });

        // Circular assistant actions
        document.querySelectorAll('.circular-action-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.executeAction(action);
            });
        });

        // Quick action badges (new layout)
        document.querySelectorAll('.quick-action-badge').forEach(badge => {
            badge.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.executeAction(action);
            });
        });
    }

    executeAction(action) {
        const mapping = this.actionMappings[action];
        if (mapping && mapping.button) {
            const button = document.querySelector(mapping.button);
            if (button) {
                button.click();
            }
        }
    }

    openCustomizeModal() {
        const modal = document.getElementById('quickActionsCustomizeModal');
        if (modal) {
            modal.style.display = 'flex';
            this.populateModalSettings();
        }
    }

    closeCustomizeModal() {
        const modal = document.getElementById('quickActionsCustomizeModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    populateModalSettings() {
        // Set current layout
        const layoutRadio = document.querySelector(`input[name="quickActionsLayout"][value="${this.currentLayout}"]`);
        if (layoutRadio) {
            layoutRadio.checked = true;
        }

        // Set current position
        const positionRadio = document.querySelector(`input[name="floatingPosition"][value="${this.floatingPosition}"]`);
        if (positionRadio) {
            positionRadio.checked = true;
        }

        // Set visible actions
        document.querySelectorAll('.action-toggle input[type="checkbox"]').forEach(checkbox => {
            const action = checkbox.dataset.action;
            checkbox.checked = this.visibleActions.has(action);
        });

        // Show/hide position section based on layout
        this.togglePositionSection();
    }

    handleLayoutChange(layout) {
        this.currentLayout = layout;
        this.togglePositionSection();
        // Don't apply immediately in modal, wait for save
    }

    togglePositionSection() {
        const positionSection = document.getElementById('floatingPositionSection');
        if (positionSection) {
            positionSection.style.display = this.currentLayout === 'floating' ? 'block' : 'none';
        }
    }

    saveCustomization() {
        // Get layout from modal
        const selectedLayout = document.querySelector('input[name="quickActionsLayout"]:checked');
        if (selectedLayout) {
            this.currentLayout = selectedLayout.value;
        }

        // Get position from modal
        const selectedPosition = document.querySelector('input[name="floatingPosition"]:checked');
        if (selectedPosition) {
            this.floatingPosition = selectedPosition.value;
        }

        // Get visible actions from modal
        this.visibleActions.clear();
        document.querySelectorAll('.action-toggle input[type="checkbox"]:checked').forEach(checkbox => {
            this.visibleActions.add(checkbox.dataset.action);
        });

        this.applyLayout();
        this.updateVisibility();
        this.saveSettings();
        this.closeCustomizeModal();

        // Update settings radio buttons
        const settingsRadio = document.querySelector(`input[name="quickActionsLayoutSetting"][value="${this.currentLayout}"]`);
        if (settingsRadio) {
            settingsRadio.checked = true;
        }

        this.showNotification('Quick Actions customization saved!', 'success');
    }

    resetToDefault() {
        this.currentLayout = 'default';
        this.floatingPosition = 'right';
        this.visibleActions = new Set(['add-member', 'record-payment', 'add-trainer', 'add-equipment', 'generate-qr', 'biometric-enroll', 'device-setup', 'send-notification']);
        
        this.applyLayout();
        this.updateVisibility();
        this.saveSettings();
        this.populateModalSettings();
        
        this.showNotification('Quick Actions reset to default!', 'info');
    }

    applyLayout() {
        const defaultCard = document.querySelector('.quick-action-card');
        const floatingBar = document.getElementById('quickActionsFloatingBar');
        const circularAssistant = document.getElementById('quickActionsCircularAssistant');

        // Hide all layouts first
        if (defaultCard) defaultCard.style.display = 'none';
        if (floatingBar) floatingBar.style.display = 'none';
        if (circularAssistant) {
            circularAssistant.style.display = 'none';
            circularAssistant.classList.remove('expanded');
            circularAssistant.classList.add('collapsed');
        }

        // Show selected layout
        switch (this.currentLayout) {
            case 'default':
                if (defaultCard) {
                    defaultCard.style.display = 'block';
                    // Apply dynamic sizing when showing default layout
                    this.applyDynamicSizing();
                }
                break;
            case 'floating':
                if (floatingBar) {
                    floatingBar.style.display = 'block';
                    this.updateFloatingBarPosition();
                }
                break;
            case 'circular':
                if (circularAssistant) {
                    circularAssistant.style.display = 'block';
                    // Keep it collapsed by default
                }
                break;
        }
    }

    updateFloatingBarPosition() {
        const floatingBar = document.getElementById('quickActionsFloatingBar');
        if (floatingBar) {
            // Remove all position classes
            floatingBar.classList.remove('position-top', 'position-bottom', 'position-left', 'position-right');
            // Add current position class
            floatingBar.classList.add(`position-${this.floatingPosition}`);
        }
    }

    updateVisibility() {
        // Update default layout visibility
        document.querySelectorAll('.quick-action-badge').forEach(badge => {
            const action = badge.dataset.action;
            badge.style.display = this.visibleActions.has(action) ? 'flex' : 'none';
        });

        // Update floating bar visibility
        document.querySelectorAll('.floating-action-btn').forEach(btn => {
            const action = btn.dataset.action;
            btn.style.display = this.visibleActions.has(action) ? 'flex' : 'none';
        });

        // Update circular assistant visibility
        document.querySelectorAll('.circular-action-item').forEach(item => {
            const action = item.dataset.action;
            item.style.display = this.visibleActions.has(action) ? 'flex' : 'none';
        });

        // Apply dynamic sizing to quick actions grid
        this.applyDynamicSizing();
    }

    applyDynamicSizing() {
        const quickActionsGrid = document.querySelector('.quick-actions-grid');
        if (!quickActionsGrid) return;

        // Count visible actions
        const visibleCount = this.visibleActions.size;

        // Remove existing sizing classes
        quickActionsGrid.classList.remove('actions-7-8', 'actions-9-plus');

        // Apply appropriate sizing class
        if (visibleCount >= 9) {
            quickActionsGrid.classList.add('actions-9-plus');
        } else if (visibleCount >= 7) {
            quickActionsGrid.classList.add('actions-7-8');
        }
        // For 6 or fewer actions, use default styling (no additional class)
    }

    hideFloatingBar() {
        this.currentLayout = 'default';
        this.applyLayout();
        this.saveSettings();
        this.showNotification('Switched to default layout', 'info');
    }

    hideCircularAssistant() {
        this.currentLayout = 'default';
        this.applyLayout();
        this.saveSettings();
        this.showNotification('Switched to default layout', 'info');
    }

    toggleCircularAssistant() {
        const circularAssistant = document.getElementById('quickActionsCircularAssistant');
        if (circularAssistant) {
            const isCollapsed = circularAssistant.classList.contains('collapsed');
            if (isCollapsed) {
                circularAssistant.classList.remove('collapsed');
                circularAssistant.classList.add('expanded');
            } else {
                circularAssistant.classList.remove('expanded');
                circularAssistant.classList.add('collapsed');
            }
        }
    }

    filterCircularActions(searchTerm) {
        const items = document.querySelectorAll('.circular-action-item');
        const term = searchTerm.toLowerCase();

        items.forEach(item => {
            const title = item.querySelector('.circular-action-title').textContent.toLowerCase();
            const matches = title.includes(term);
            item.style.display = matches ? 'flex' : 'none';
        });
    }

    saveSettings() {
        const settings = {
            layout: this.currentLayout,
            floatingPosition: this.floatingPosition,
            visibleActions: Array.from(this.visibleActions)
        };
        localStorage.setItem('quickActionsSettings', JSON.stringify(settings));
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('quickActionsSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.currentLayout = settings.layout || 'default';
                this.floatingPosition = settings.floatingPosition || 'right';
                this.visibleActions = new Set(settings.visibleActions || ['add-member', 'record-payment', 'add-trainer', 'add-equipment', 'generate-qr', 'biometric-enroll', 'device-setup', 'send-notification']);
            }
        } catch (error) {
            console.warn('Failed to load quick actions settings:', error);
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `quick-actions-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 999999;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuickActionsCustomizer();
});

// Additional CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
.quick-actions-notification .notification-content {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
}

.quick-actions-notification .notification-content i {
    font-size: 1.1rem;
}
`;
document.head.appendChild(notificationStyles);
