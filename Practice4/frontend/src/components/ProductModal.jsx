import React, { useEffect, useState } from 'react';

export default function ProductModal({ open, mode, initialProduct, onClose, onSubmit }) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [rating, setRating] = useState('');

    useEffect(() => {
        if (!open) return;
        
        if (initialProduct) {
            setName(initialProduct.name || '');
            setCategory(initialProduct.category || '');
            setDescription(initialProduct.description || '');
            setPrice(initialProduct.price?.toString() || '');
            setStock(initialProduct.stock?.toString() || '');
            setRating(initialProduct.rating?.toString() || '');
        } else {
            setName('');
            setCategory('');
            setDescription('');
            setPrice('');
            setStock('');
            setRating('');
        }
    }, [open, initialProduct]);

    if (!open) return null;

    const title = mode === 'edit' ? 'Редактирование товара' : 'Создание нового товара';

    const handleSubmit = (e) => {
        e.preventDefault();

        const trimmedName = name.trim();
        const trimmedCategory = category.trim();
        const trimmedDescription = description.trim();
        const parsedPrice = Number(price);
        const parsedStock = Number(stock);
        const parsedRating = rating ? Number(rating) : 0;

        if (!trimmedName) {
            alert('Введите название товара');
            return;
        }

        if (!trimmedCategory) {
            alert('Введите категорию');
            return;
        }

        if (!trimmedDescription) {
            alert('Введите описание');
            return;
        }

        if (!price || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            alert('Введите корректную цену (больше 0)');
            return;
        }

        if (!stock || !Number.isFinite(parsedStock) || parsedStock < 0) {
            alert('Введите корректное количество (0 или больше)');
            return;
        }

        if (rating && (!Number.isFinite(parsedRating) || parsedRating < 0 || parsedRating > 5)) {
            alert('Рейтинг должен быть от 0 до 5');
            return;
        }

        onSubmit({
            id: initialProduct?.id,
            name: trimmedName,
            category: trimmedCategory,
            description: trimmedDescription,
            price: parsedPrice,
            stock: parsedStock,
            rating: parsedRating || 0
        });
    };

    return (
        <div className="backdrop" onMouseDown={onClose}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
                <div className="modal__header">
                    <div className="modal__title">{title}</div>
                    <button className="iconBtn" onClick={onClose}>✕</button>
                </div>

                <form className="form" onSubmit={handleSubmit}>
                    <label className="label">
                        Название товара *
                        <input
                            className="input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Например, Ноутбук ASUS"
                            autoFocus
                        />
                    </label>

                    <div className="row">
                        <label className="label">
                            Категория *
                            <input
                                className="input"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="Например, Электроника"
                            />
                        </label>

                        <label className="label">
                            Рейтинг
                            <input
                                className="input"
                                type="number"
                                step="0.1"
                                min="0"
                                max="5"
                                value={rating}
                                onChange={(e) => setRating(e.target.value)}
                                placeholder="0-5"
                            />
                        </label>
                    </div>

                    <label className="label">
                        Описание *
                        <textarea
                            className="textarea"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Подробное описание товара..."
                        />
                    </label>

                    <div className="row">
                        <label className="label">
                            Цена (₽) *
                            <input
                                className="input"
                                type="number"
                                min="0"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="Например, 9990"
                            />
                        </label>

                        <label className="label">
                            Количество на складе *
                            <input
                                className="input"
                                type="number"
                                min="0"
                                step="1"
                                value={stock}
                                onChange={(e) => setStock(e.target.value)}
                                placeholder="Например, 10"
                            />
                        </label>
                    </div>

                    <div className="modal__footer">
                        <button type="button" className="btn" onClick={onClose}>
                            Отмена
                        </button>
                        <button type="submit" className="btn btn--primary">
                            {mode === 'edit' ? 'Сохранить изменения' : 'Создать товар'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}