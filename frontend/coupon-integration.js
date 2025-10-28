/**
 * Coupon Integration for Membership Purchase
 * Handles coupon selection, validation, and application during membership purchase
 */

class CouponManager {
    constructor() {
        this.selectedCoupon = null;
        this.purchaseData = null;
        this.availableCoupons = [];
        this.appliedCoupon = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close modal
        document.addEventListener('click', (e) => {
            if (e.target.id === 'close-coupon-modal') {
                this.closeCouponModal();
            }
        });

        // Apply manual coupon
        document.addEventListener('click', (e) => {
            if (e.target.id === 'apply-manual-coupon') {
                this.applyManualCoupon();
            }
        });

        // Proceed buttons
        document.addEventListener('click', (e) => {
            if (e.target.id === 'proceed-without-coupon') {
                this.proceedToPurchase(null);
            }
            if (e.target.id === 'proceed-with-coupon') {
                this.proceedToPurchase(this.appliedCoupon);
            }
        });

        // Coupon selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.coupon-option')) {
                this.selectCoupon(e.target.closest('.coupon-option'));
            }
        });

        // Enter key for manual coupon input
        document.addEventListener('keypress', (e) => {
            if (e.target.id === 'manual-coupon-code' && e.key === 'Enter') {
                this.applyManualCoupon();
            }
        });
    }

    async showCouponSelectionModal(purchaseData) {
        this.purchaseData = purchaseData;
        
        // Update purchase summary
        this.updatePurchaseSummary();
        
        // Load available coupons
        await this.loadAvailableCoupons();
        
        // Show modal
        const modal = document.getElementById('coupon-selection-modal');
        modal.style.display = 'block';
        
        // Reset state
        this.appliedCoupon = null;
        this.updateProceedButton();
        this.clearValidationMessage();
        
        // Focus on manual input
        setTimeout(() => {
            document.getElementById('manual-coupon-code').focus();
        }, 300);
    }

    updatePurchaseSummary() {
        if (!this.purchaseData) return;

        document.getElementById('summary-plan-name').textContent = this.purchaseData.planName;
        document.getElementById('summary-duration').textContent = `${this.purchaseData.months} month(s)`;
        document.getElementById('summary-original-price').textContent = `₹${this.purchaseData.originalAmount}`;
        
        // Show plan discount if exists
        if (this.purchaseData.discountAmount > 0) {
            document.getElementById('plan-discount').style.display = 'flex';
            document.getElementById('summary-plan-discount').textContent = `₹${this.purchaseData.discountAmount}`;
        } else {
            document.getElementById('plan-discount').style.display = 'none';
        }
        
        // Initially show total without coupon
        document.getElementById('summary-final-price').textContent = `₹${this.purchaseData.totalAmount}`;
        document.getElementById('coupon-discount').style.display = 'none';
    }

    async loadAvailableCoupons() {
        const container = document.getElementById('available-coupons');
        
        try {
            // Get coupons from offers manager if available
            if (window.gymOffersManager) {
                this.availableCoupons = window.gymOffersManager.getAvailableCoupons();
            } else {
                // Fallback to localStorage
                const userCoupons = JSON.parse(localStorage.getItem('userCoupons') || '[]');
                this.availableCoupons = userCoupons.filter(coupon => 
                    coupon.status === 'active' && 
                    new Date(coupon.validUntil) > new Date() &&
                    coupon.gymId === this.purchaseData.gymId
                );
            }

            if (this.availableCoupons.length === 0) {
                container.innerHTML = `
                    <div class="no-coupons-message">
                        <i class="fas fa-ticket-alt"></i>
                        <p>No coupons available for this gym.</p>
                        <p>You can still enter a coupon code manually below.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = this.availableCoupons.map(coupon => `
                <div class="coupon-option" data-coupon-code="${coupon.code}">
                    <div class="coupon-info">
                        <div class="coupon-code">${coupon.code}</div>
                        <div class="coupon-discount">
                            ${coupon.discountType === 'percentage' ? coupon.discountValue + '% OFF' : 'FREE SERVICE'}
                        </div>
                    </div>
                    <div class="coupon-details">
                        Valid until: ${new Date(coupon.validUntil).toLocaleDateString()}
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading coupons:', error);
            container.innerHTML = `
                <div class="no-coupons-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading coupons. Please try manually entering a code.</p>
                </div>
            `;
        }
    }

    selectCoupon(couponElement) {
        // Remove previous selection
        document.querySelectorAll('.coupon-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Select this coupon
        couponElement.classList.add('selected');
        
        const couponCode = couponElement.dataset.couponCode;
        this.validateAndApplyCoupon(couponCode);
    }

    async applyManualCoupon() {
        const couponCode = document.getElementById('manual-coupon-code').value.trim().toUpperCase();
        
        if (!couponCode) {
            this.showValidationMessage('Please enter a coupon code.', 'error');
            return;
        }

        await this.validateAndApplyCoupon(couponCode);
    }

    async validateAndApplyCoupon(couponCode) {
        try {
            this.showValidationMessage('Validating coupon...', 'info');

            // Check if it's one of user's available coupons
            let coupon = this.availableCoupons.find(c => c.code === couponCode);
            
            if (!coupon) {
                // Try backend validation
                const response = await fetch(`${window.BASE_URL || 'http://localhost:5000'}/api/offers/coupon/${couponCode}/validate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
                    },
                    body: JSON.stringify({
                        userId: localStorage.getItem('userId') || 'demo-user',
                        membershipPrice: this.purchaseData.totalAmount,
                        gymId: this.purchaseData.gymId
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        this.applyCouponDiscount(result);
                        this.showValidationMessage('Coupon applied successfully!', 'success');
                        return;
                    }
                }
            } else {
                // Use local coupon validation
                if (window.gymOffersManager) {
                    const result = window.gymOffersManager.applyCoupon(couponCode, this.purchaseData.totalAmount);
                    if (result.success) {
                        this.applyCouponDiscount(result);
                        this.showValidationMessage('Coupon applied successfully!', 'success');
                        return;
                    } else {
                        this.showValidationMessage(result.message, 'error');
                        return;
                    }
                }
            }

            // If we get here, coupon is invalid
            this.showValidationMessage('Invalid or expired coupon code.', 'error');
            
        } catch (error) {
            console.error('Error validating coupon:', error);
            this.showValidationMessage('Error validating coupon. Please try again.', 'error');
        }
    }

    applyCouponDiscount(result) {
        this.appliedCoupon = {
            code: result.couponCode || document.getElementById('manual-coupon-code').value.trim().toUpperCase(),
            discountAmount: result.discountAmount,
            finalPrice: result.finalPrice,
            originalPrice: result.originalPrice
        };

        // Update UI
        document.getElementById('coupon-discount').style.display = 'flex';
        document.getElementById('summary-coupon-discount').textContent = `₹${result.discountAmount}`;
        document.getElementById('summary-final-price').textContent = `₹${result.finalPrice}`;
        
        this.updateProceedButton();
    }

    showValidationMessage(message, type) {
        const messageEl = document.getElementById('coupon-validation-message');
        messageEl.textContent = message;
        messageEl.className = `coupon-validation-message ${type}`;
        messageEl.style.display = 'block';

        if (type === 'info') {
            setTimeout(() => {
                if (messageEl.textContent === message) {
                    this.clearValidationMessage();
                }
            }, 3000);
        }
    }

    clearValidationMessage() {
        const messageEl = document.getElementById('coupon-validation-message');
        messageEl.style.display = 'none';
        messageEl.textContent = '';
        messageEl.className = 'coupon-validation-message';
    }

    updateProceedButton() {
        const withCouponBtn = document.getElementById('proceed-with-coupon');
        const withoutCouponBtn = document.getElementById('proceed-without-coupon');

        if (this.appliedCoupon) {
            withCouponBtn.style.display = 'block';
            withoutCouponBtn.textContent = 'Remove Coupon & Proceed';
        } else {
            withCouponBtn.style.display = 'none';
            withoutCouponBtn.textContent = 'Proceed Without Coupon';
        }
    }

    async proceedToPurchase(couponData) {
        this.closeCouponModal();

        // Update purchase data with coupon info
        if (couponData) {
            this.purchaseData.appliedCoupon = couponData;
            this.purchaseData.finalAmount = couponData.finalPrice;
            this.purchaseData.couponDiscount = couponData.discountAmount;
        } else {
            this.purchaseData.appliedCoupon = null;
            this.purchaseData.finalAmount = this.purchaseData.totalAmount;
            this.purchaseData.couponDiscount = 0;
        }

        // Continue with the original purchase flow
        await this.executePurchase(this.purchaseData);
    }

    async executePurchase(purchaseData) {
        try {
            console.log('Executing purchase with data:', purchaseData);
            
            // Prepare payment gateway URL with coupon data
            const paymentParams = {
                type: 'membership',
                gymId: purchaseData.gymId,
                gymName: purchaseData.gymName,
                planName: purchaseData.planName,
                duration: purchaseData.months,
                amount: purchaseData.finalAmount,
                originalPrice: purchaseData.originalAmount,
                monthlyPrice: Math.ceil(purchaseData.originalAmount / purchaseData.months),
                originalAmount: purchaseData.originalAmount,
                discount: purchaseData.discountAmount || 0,
                discountAmount: purchaseData.discountAmount || 0,
                email: purchaseData.user.email,
                phone: purchaseData.user.phone,
                name: purchaseData.user.name || purchaseData.user.fullName
            };

            // Add coupon data if applied
            if (purchaseData.appliedCoupon) {
                paymentParams.couponCode = purchaseData.appliedCoupon.code;
                paymentParams.couponDiscount = purchaseData.appliedCoupon.discountAmount;
                paymentParams.couponApplied = 'true';
            }

            const paymentUrl = `/frontend/payment-gateway.html?` + new URLSearchParams(paymentParams).toString();
            
            console.log('Redirecting to payment gateway with coupon data:', paymentUrl);
            window.location.href = paymentUrl;

        } catch (error) {
            console.error('Error processing purchase:', error);
            showError('Failed to process purchase. Please try again.');
        }
    }

    showPurchaseSuccess(purchaseData) {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 40px; border-radius: 15px; text-align: center; max-width: 500px; width: 90%;">
                    <i class="fas fa-check-circle" style="font-size: 4rem; color: #28a745; margin-bottom: 20px;"></i>
                    <h2 style="color: #333; margin-bottom: 15px;">Purchase Successful!</h2>
                    <p style="color: #666; margin-bottom: 20px;">Your ${purchaseData.planName} membership has been activated.</p>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: left;">
                        <h4 style="margin: 0 0 10px 0; color: #333;">Purchase Details:</h4>
                        <p style="margin: 5px 0;"><strong>Plan:</strong> ${purchaseData.planName}</p>
                        <p style="margin: 5px 0;"><strong>Duration:</strong> ${purchaseData.months} month(s)</p>
                        ${purchaseData.appliedCoupon ? 
                            `<p style="margin: 5px 0; color: #28a745;"><strong>Coupon Applied:</strong> ${purchaseData.appliedCoupon.code}</p>
                             <p style="margin: 5px 0; color: #28a745;"><strong>Discount:</strong> ₹${purchaseData.appliedCoupon.discountAmount}</p>` : ''
                        }
                        <p style="margin: 5px 0;"><strong>Total Paid:</strong> ₹${purchaseData.finalAmount}</p>
                    </div>
                    
                    <button onclick="this.closest('div').parentElement.remove(); window.location.href='index.html';" 
                            style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                        Continue
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    closeCouponModal() {
        const modal = document.getElementById('coupon-selection-modal');
        modal.style.display = 'none';
        
        // Reset form
        document.getElementById('manual-coupon-code').value = '';
        this.clearValidationMessage();
        this.appliedCoupon = null;
        
        // Remove selections
        document.querySelectorAll('.coupon-option').forEach(option => {
            option.classList.remove('selected');
        });
    }
}

// Initialize coupon manager
let couponManager;
document.addEventListener('DOMContentLoaded', () => {
    couponManager = new CouponManager();
});

// Export for external use
window.couponManager = couponManager;