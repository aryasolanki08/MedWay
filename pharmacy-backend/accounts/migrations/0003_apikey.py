import accounts.models
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0002_pharmacy_razorpay_order_id_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='APIKey',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(default=accounts.models.generate_api_key, editable=False, max_length=64, unique=True)),
                ('name', models.CharField(default='Integration Key', max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('last_used_at', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='api_keys', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
