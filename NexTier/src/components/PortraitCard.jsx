function PortraitCard({ children, className = '' }){
    return (
        <div className={`relative flex h-auto min-h-72 flex-col rounded-3xl shadow-xl overflow-hidden p-5 sm:min-h-96 sm:p-6 ${className}`}>
            {children}
        </div>
    );
}

export default PortraitCard