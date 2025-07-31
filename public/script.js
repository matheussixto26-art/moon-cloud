document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const loginForm = document.getElementById('login-form');
    const loginButton = document.getElementById('login-button');
    const loginMessage = document.getElementById('login-message');
    const saveLoginCheckbox = document.getElementById('save-login-checkbox');
    let fullData = {};

    const showDashboard = () => {
        populateDashboard();
        setupEventListeners();
        loginScreen.style.display = 'none';
        dashboardScreen.classList.remove('hidden');
        dashboardScreen.classList.add('fade-in');
    };

    const performLogin = async (ra, senha) => {
        loginButton.disabled = true;
        const messages = ['Verificando credenciais...', 'Acessando plataforma...', 'Buscando dados...'];
        let messageIndex = 0;
        loginMessage.textContent = messages[messageIndex];
        const interval = setInterval(() => {
            messageIndex = (messageIndex + 1) % messages.length;
            loginMessage.textContent = messages[messageIndex];
        }, 1500);

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: ra, senha: senha }),
            });
            const data = await response.json();
            clearInterval(interval);
            if (!response.ok) throw new Error(data.error);
            
            if (saveLoginCheckbox.checked) {
                localStorage.setItem('savedCredentials', JSON.stringify({ ra, senha }));
            }
            
            fullData = data;
            showDashboard();
        } catch (error) {
            clearInterval(interval);
            loginMessage.textContent = `❌ ${error.message}`;
            localStorage.removeItem('savedCredentials'); // Limpa se der erro
        } finally {
            loginButton.disabled = false;
        }
    };

    // Auto-login
    const savedCredentials = localStorage.getItem('savedCredentials');
    if (savedCredentials) {
        const { ra, senha } = JSON.parse(savedCredentials);
        document.getElementById('ra').value = ra;
        document.getElementById('senha').value = senha;
        saveLoginCheckbox.checked = true;
        performLogin(ra, senha);
    }

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!saveLoginCheckbox.checked) {
            localStorage.removeItem('savedCredentials');
        }
        performLogin(document.getElementById('ra').value, document.getElementById('senha').value);
    });

    function populateDashboard() {
        const userName = fullData.userInfo?.NOME_COMPLETO || fullData.userInfo?.NOME || fullData.userInfo?.NAME || 'Aluno(a)';
        const firstName = userName.split(' ')[0];
        document.getElementById('welcome-message').textContent = `Bem-vindo(a), ${firstName}!`;
        document.getElementById('school-name').textContent = fullData.userInfo?.NOME_ESCOLA || 'Escola não encontrada';
        
        document.getElementById('faltas-count').textContent = fullData.faltas?.length || 0;
        document.getElementById('tarefas-count').textContent = fullData.tarefas?.length || 0;
        document.getElementById('conquistas-count').textContent = fullData.conquistas?.length || 0;
        document.getElementById('notificacoes-count').textContent = fullData.notificacoes?.length || 0;
        document.getElementById('medalhas-count').textContent = fullData.medalhasSemanais?.length || 0;
    }

    function setupEventListeners() {
        document.querySelectorAll('.dashboard-card').forEach(card => card.addEventListener('click', () => showModal(card.dataset.modalTarget)));
        document.querySelectorAll('.modal-overlay').forEach(modal => modal.addEventListener('click', (e) => e.target === modal && hideModal(modal.id)));
        document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', () => hideModal(btn.closest('.modal-overlay').id)));
        document.getElementById('hamburger-btn').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('is-open'));
    }

    function showModal(modalId) {
        if (!modalId) return;
        const modal = document.getElementById(modalId);
        let content = '<p style="padding: 15px;">Nenhuma informação encontrada.</p>';
        
        try {
            if (modalId === 'boletim-modal') {
                const grid = modal.querySelector('.boletim-grid');
                if (fullData.boletim?.length > 0) content = fullData.boletim.map(d => `<div class="list-item"><h3>${d.descricaoDisciplina}</h3><p>Nota: ${d.notaBimestre1 || '-'}</p></div>`).join('');
                grid.innerHTML = content;
            } else {
                const list = modal.querySelector('.modal-list');
                switch(modalId) {
                    case 'faltas-modal':
                        if (fullData.faltas?.length > 0) content = fullData.faltas.map(item => `<li class="list-item"><h3>${item.disciplina}</h3><p>Faltas: ${item.numeroFaltas}</p></li>`).join('');
                        break;
                    case 'tarefas-modal':
                        if (fullData.tarefas?.length > 0) content = fullData.tarefas.map(item => `<li class="list-item" onclick="openTaskViewer(${item.id}, '${item.publication_target}')"><h3>${item.title}</h3><p>Status: ${item.status === 'expired' ? 'Expirada' : 'Pendente'}</p></li>`).join('');
                        break;
                    case 'conquistas-modal':
                        if (fullData.conquistas?.length > 0) content = fullData.conquistas.map(item => `<li class="list-item"><h3>${item.projeto}</h3><p>Medalha: ${item.medalha}</p></li>`).join('');
                        break;
                    case 'notificacoes-modal':
                        if (fullData.notificacoes?.length > 0) content = fullData.notificacoes.map(item => `<li class="list-item"><h3>${item.seesp_titulo}</h3><p>${item.seesp_mensagem}</p></li>`).join('');
                        break;
                    case 'medalhas-modal':
                        if (fullData.medalhasSemanais?.length > 0) content = fullData.medalhasSemanais.map(item => `<li class="list-item"><h3>${item.goal.name}</h3><p>Progresso: ${item.progress} / ${item.goal.target_value}</p></li>`).join('');
                        break;
                }
                list.innerHTML = content;
            }
        } catch(e) { console.error("Erro ao popular modal:", e); }
        modal.classList.add('is-visible');
    }

    function hideModal(modalId) { document.getElementById(modalId)?.classList.remove('is-visible'); }
    
    async function openTaskViewer(taskId, room) {
        hideModal('tarefas-modal');
        const modal = document.getElementById('task-viewer-modal');
        const titleEl = document.getElementById('task-viewer-title');
        const contentEl = document.getElementById('task-viewer-content');
        const formEl = document.getElementById('task-form');

        titleEl.textContent = 'Carregando tarefa...'; contentEl.innerHTML = '';
        showModal('task-viewer-modal');

        try {
            const response = await fetch('/api/task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'preview', taskId, room, token: fullData.auth_token }),
            });
            const taskDetails = await response.json();
            if (!response.ok) throw new Error(taskDetails.error);
            
            titleEl.textContent = taskDetails.task.title;
            renderTaskQuestions(taskDetails.task.questions);
            formEl.onsubmit = (e) => { e.preventDefault(); submitTask(taskId, room); };
        } catch (error) { contentEl.innerHTML = `<p style="color:var(--accent-red)">${error.message}</p>`; }
    }
            
    function renderTaskQuestions(questions) {
        const contentEl = document.getElementById('task-viewer-content');
        contentEl.innerHTML = questions.map(q => `
            <div class="question" data-question-id="${q.id}" data-question-type="${q.type}">
                <h4>${q.title}</h4>
                ${q.options.map(opt => `
                    <div class="question-option">
                        <label>
                            <input type="${q.type === 'multi' ? 'checkbox' : 'radio'}" name="q-${q.id}" value="${opt.id}"> 
                            ${opt.title}
                        </label>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    async function submitTask(taskId, room) {
        const answers = {};
        document.querySelectorAll('#task-viewer-content .question').forEach(qDiv => {
            const qId = qDiv.dataset.questionId, qType = qDiv.dataset.questionType;
            const selectedOptions = {};
            qDiv.querySelectorAll('input:checked').forEach(input => { selectedOptions[input.value] = true; });
            if (Object.keys(selectedOptions).length > 0) {
                answers[qId] = { question_id: parseInt(qId), question_type: qType, answer: selectedOptions };
            }
        });

        const submitButton = document.getElementById('submit-task-button');
        submitButton.disabled = true;
        try {
            const response = await fetch('/api/task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'submit', taskId, room, token: fullData.auth_token, answers }),
            });
            if (!response.ok) { const errData = await response.json(); throw new Error(errData.details?.message || 'Erro desconhecido'); }
            alert('Tarefa enviada com sucesso!');
            hideModal('task-viewer-modal');
        } catch (error) {
            alert(`Erro ao enviar tarefa: ${error.message}`);
        } finally {
            submitButton.disabled = false;
        }
    }
    window.openTaskViewer = openTaskViewer;
});
</script>
</body>
</html>
