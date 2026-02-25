// Past Winners Modal Functionality

// Store all past winners globally
window.allPastWinners = window.allPastWinners || [];

// Show all past winners modal
function showAllPastWinners() {
    if (!window.allPastWinners || window.allPastWinners.length === 0) {
        alert('No past winners found');
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'pastWinnersModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
        animation: fadeIn 0.3s ease-out;
    `;

    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 25px;
            max-width: 800px;
            width: 100%;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 0 25px 80px rgba(0,0,0,0.3);
            animation: slideInUp 0.5s ease-out;
        ">
            <div style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 25px 30px;
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <h2 style="margin: 0; font-size: 24px;">🏆 Hall of Champions</h2>
                <button onclick="document.getElementById('pastWinnersModal').remove()" style="
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">×</button>
            </div>
            <div style="
                max-height: calc(80vh - 100px);
                overflow-y: auto;
                padding: 20px 30px;
            ">
                ${window.allPastWinners.map((winner, index) => `
                    <div style="
                        background: linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%);
                        border-radius: 15px;
                        padding: 20px;
                        margin-bottom: 15px;
                        border: 2px solid #e9ecef;
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        transition: transform 0.3s ease;
                    " onmouseover="this.style.transform='translateX(5px)'" onmouseout="this.style.transform='translateX(0)'">
                        <div style="
                            width: 50px;
                            height: 50px;
                            border-radius: 50%;
                            background: ${index === 0 ? 'linear-gradient(135deg, #FFD700, #FFA500)' : index === 1 ? 'linear-gradient(135deg, #C0C0C0, #A0A0A0)' : index === 2 ? 'linear-gradient(135deg, #CD7F32, #B87333)' : 'linear-gradient(135deg, #667eea, #764ba2)'};
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                            color: white;
                            font-weight: 800;
                            flex-shrink: 0;
                        ">
                            ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </div>
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 5px 0; color: #333; font-size: 18px;">${escapeHtml(winner.winner_name)}</h3>
                            <p style="margin: 0; color: #666; font-size: 14px;">${winner.event_name}</p>
                            <div style="display: flex; gap: 10px; margin-top: 8px;">
                                <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3px 10px; border-radius: 10px; font-size: 12px;">${escapeHtml(winner.winner_class || 'N/A')}</span>
                                <span style="background: #FFD700; color: #333; padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: 600;">🏆 ${winner.winner_points || 0} pts</span>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <p style="margin: 0; color: #999; font-size: 12px;">${new Date(winner.ended_at || winner.updated_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    document.body.appendChild(modal);
}
