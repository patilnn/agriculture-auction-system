document.addEventListener('DOMContentLoaded', () => {
    // Sidebar toggle functionality
    document.getElementById('sidebarToggle').addEventListener('click', function () {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');

        // Toggle the sidebar
        if (sidebar.style.left === '0px') {
            sidebar.style.left = '-250px';
            if (mainContent) mainContent.style.marginLeft = '0';
        } else {
            sidebar.style.left = '0px';
            if (mainContent) mainContent.style.marginLeft = '250px';
        }
    });
});