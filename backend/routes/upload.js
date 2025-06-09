import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const router = express.Router();

// Configurar o multer
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB (increased to match frontend validation)
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato de arquivo inválido. Use JPEG, PNG ou WebP.'));
        }
    }
}).single('image');

router.post('/', async (req, res) => {
    try {
        upload(req, res, async (err) => {
            if (err) {
                console.error('Erro no upload:', err);
                return res.status(400).json({
                    success: false,
                    error: err.message
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Nenhum arquivo enviado'
                });
            }

            try {
                const fileExt = path.extname(req.file.originalname);
                const fileName = `devotly-cards/${uuidv4()}${fileExt}`;

                const { error: uploadError } = await req.supabase
                    .storage
                    .from('card-images')
                    .upload(fileName, req.file.buffer, {
                        contentType: req.file.mimetype,
                        upsert: true // Alterado para true
                    });

                if (uploadError) {
                    throw new Error(`Erro no upload: ${uploadError.message}`);
                }

                const { data: urlData } = await req.supabase
                    .storage
                    .from('card-images')
                    .getPublicUrl(fileName);

                if (!urlData?.publicUrl) {
                    throw new Error('Erro ao obter URL pública');
                }

                res.json({
                    success: true,
                    url: urlData.publicUrl
                });

            } catch (error) {
                console.error('Erro no processamento:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno no servidor'
        });
    }
});

export default router;