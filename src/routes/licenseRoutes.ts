import { Router } from 'express';
import { LicenseController } from '../controllers/LicenseController';
import { 
  validateRequest, 
  validateQuery, 
  validateParams 
} from '../middleware/validation';
import { 
  verifyLicenseSchema,
  createLicenseSchema, 
  webhookSchema, 
  paginationSchema,
  licenseKeySchema,
  updateLicenseSchema
} from '../middleware/schemas';
import { 
  licenseVerificationRateLimit,
  licenseCreationRateLimit 
} from '../middleware/security';

export const createLicenseRoutes = (licenseController: LicenseController): Router => {
  const router = Router();

  router.post(
    '/verify',
    licenseVerificationRateLimit,
    validateRequest(verifyLicenseSchema),
    (req, res) => licenseController.verifyLicense(req, res)
  );

  router.post(
    '/create',
    licenseCreationRateLimit,
    validateRequest(createLicenseSchema),
    (req, res) => licenseController.createLicense(req, res)
  );

  router.get(
    '/stats',
    (req, res) => licenseController.getLicenseStats(req, res)
  );

  router.get(
    '/',
    validateQuery(paginationSchema),
    (req, res) => licenseController.getAllLicenses(req, res)
  );

  router.get(
    '/:key',
    validateParams(licenseKeySchema),
    (req, res) => licenseController.getLicenseByKey(req, res)
  );

  router.post(
    '/:key/deactivate',
    validateParams(licenseKeySchema),
    (req, res) => licenseController.deactivateLicense(req, res)
  );

  router.post(
    '/:key/activate',
    validateParams(licenseKeySchema),
    (req, res) => licenseController.activateLicense(req, res)
  );

  router.patch(
    '/:key',
    validateParams(licenseKeySchema),
    validateRequest(updateLicenseSchema),
    (req, res) => licenseController.updateLicense(req, res)
  );

  router.delete(
    '/:key',
    validateParams(licenseKeySchema),
    (req, res) => licenseController.deleteLicense(req, res)
  );

  router.post(
    '/webhook',
    validateRequest(webhookSchema),
    (req, res) => licenseController.processWebhook(req, res)
  );

  return router;
};
