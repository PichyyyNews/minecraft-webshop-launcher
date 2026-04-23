import styles from './MinecraftLoader.module.css';

export default function MinecraftLoader() {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[oklab(0_0_0/0.6)] backdrop-blur-sm animate-in fade-in duration-200">
            <div className={styles.loader}>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    );
}
